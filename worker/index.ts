import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { ChatMessage, ChatTurn, Job, RenderSpec, ResolvedAssets } from "../src/lib/types";
import { brainProvider, buildSpec } from "./brain";
import { route } from "./converse";
import { resolveAssets } from "./assets";
import { getThread, insertGeneration, listHistory, setVideoUrl, type ThreadRow } from "./db";
import { normalizeUrl, scrapeSite } from "./scrape";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/chat", async (c) => {
  const body = await c.req.json<{
    message?: string;
    sessionId?: string;
    turnstileToken?: string;
    history?: ChatTurn[];
  }>();
  if (!body.message?.trim()) return c.json({ error: "message required" }, 400);

  const ok = await verifyTurnstile(c.env, body.turnstileToken, c.req.header("cf-connecting-ip"));
  if (!ok) return c.json({ error: "bot verification failed" }, 403);

  const text = body.message.trim();
  const sessionId = body.sessionId;
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((h) => h && typeof h.content === "string" && (h.role === "user" || h.role === "assistant"))
    .slice(-8);
  const log = (p: Promise<unknown>) => c.executionCtx.waitUntil(p.catch(() => {}));

  const decision = await route(c.env, text, history);
  if (decision.action === "chat") {
    log(
      insertGeneration(c.env.DB, {
        id: nanoid(),
        sessionId,
        prompt: text,
        action: "chat",
        reply: decision.reply,
        model: brainProvider(c.env),
      }),
    );
    return c.json({ kind: "reply", text: decision.reply });
  }

  const url = normalizeUrl(text);
  const site = url ? await scrapeSite(url) : null;
  const { spec, source } = await buildSpec(c.env, text, site, history);
  const assets = await resolveAssets(c.env, spec, site);
  const id = nanoid();

  // awaited so the row exists before the client uploads its rendered video to /api/videos/:id
  try {
    await insertGeneration(c.env.DB, {
      id,
      sessionId,
      prompt: text,
      action: "generate",
      format: spec.format,
      productName: spec.productName,
      siteUrl: spec.siteUrl,
      concept: spec.concept,
      caption: spec.caption,
      spec,
      assets,
      model: source,
    });
  } catch {}

  const job: Job = {
    id,
    status: "done",
    progress: 100,
    spec,
    assets: proxify(assets),
    concept: spec.concept,
    model: source,
  };
  return c.json({ kind: "job", job });
});

async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  ip: string | undefined,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true; // not configured (e.g. local dev) → allow
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

app.get("/api/history", async (c) => {
  try {
    const items = await listHistory(c.env.DB, c.req.query("session") ?? null);
    return c.json({ items });
  } catch {
    return c.json({ items: [] });
  }
});

app.get("/api/thread/:session", async (c) => {
  try {
    const rows = await getThread(c.env.DB, c.req.param("session"));
    return c.json({ messages: rows.flatMap(rebuildTurn) });
  } catch {
    return c.json({ messages: [] });
  }
});

function rebuildTurn(r: ThreadRow): ChatMessage[] {
  const out: ChatMessage[] = [{ id: `${r.id}-u`, role: "user", text: r.prompt, createdAt: r.created_at }];
  if (r.action === "chat") {
    if (r.reply) out.push({ id: `${r.id}-a`, role: "assistant", text: r.reply, createdAt: r.created_at });
    return out;
  }
  const assets = parseJson<ResolvedAssets>(r.assets);
  const job: Job = {
    id: r.id,
    status: "done",
    progress: 100,
    spec: parseJson<RenderSpec>(r.spec) ?? undefined,
    assets: assets ? proxify(assets) : undefined,
    videoUrl: r.video_url ?? undefined,
    concept: r.concept ?? undefined,
    model: r.model ?? undefined,
  };
  out.push({ id: `${r.id}-a`, role: "assistant", job, createdAt: r.created_at });
  return out;
}

function parseJson<T>(s: string | null): T | null {
  try {
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

const ALLOWED = ["pexels.com", "giphy.com", "jamendo.com", "picsum.photos", "wikimedia.org", "openverse.org"];
const allowedHost = (h: string) => ALLOWED.some((d) => h === d || h.endsWith(`.${d}`));
const proxyUrl = (u?: string) => (u ? `/api/asset?u=${encodeURIComponent(u)}` : u);

function proxify(a: ResolvedAssets): ResolvedAssets {
  return {
    background: { ...a.background, url: proxyUrl(a.background.url), poster: proxyUrl(a.background.poster) },
    gif: a.gif ? { ...a.gif, url: proxyUrl(a.gif.url)! } : null,
    audio: a.audio ? { ...a.audio, url: proxyUrl(a.audio.url)! } : null,
  };
}

app.get("/api/asset", async (c) => {
  const u = c.req.query("u");
  if (!u) return c.text("missing u", 400);
  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return c.text("bad url", 400);
  }
  if (target.protocol !== "https:" || !allowedHost(target.hostname)) return c.text("forbidden", 403);

  const upstream = await fetch(target.toString(), { signal: AbortSignal.timeout(20000) });
  if (!upstream.ok || !upstream.body) return c.text("upstream error", 502);
  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/octet-stream",
      "cache-control": "public, max-age=86400",
    },
  });
});

app.put("/api/videos/:key", async (c) => {
  const key = c.req.param("key");
  if (!/^[A-Za-z0-9_-]+\.mp4$/.test(key)) return c.text("bad key", 400);
  if (!c.req.raw.body) return c.text("no body", 400);
  // only accept uploads for an id created by a verified /api/chat generation
  const known = await c.env.DB.prepare("SELECT 1 FROM generations WHERE id = ? LIMIT 1")
    .bind(key.replace(/\.mp4$/, ""))
    .first();
  if (!known) return c.text("unknown id", 403);
  await c.env.VIDEOS.put(key, c.req.raw.body, { httpMetadata: { contentType: "video/mp4" } });
  const base = c.env.ASSETS_BASE_URL?.replace(/\/+$/, "");
  const url = base ? `${base}/${key}` : `/v/${key}`;
  c.executionCtx.waitUntil(setVideoUrl(c.env.DB, key.replace(/\.mp4$/, ""), url).catch(() => {}));
  return c.json({ url });
});

app.get("/v/:key", async (c) => {
  const obj = await c.env.VIDEOS.get(c.req.param("key"));
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType || "video/mp4",
      "cache-control": "public, max-age=31536000, immutable",
      etag: obj.httpEtag,
    },
  });
});

const FFMPEG_FILES: Record<string, string> = {
  "ffmpeg-core.js": "text/javascript",
  "ffmpeg-core.wasm": "application/wasm",
};

app.get("/ffmpeg/:file", async (c) => {
  const type = FFMPEG_FILES[c.req.param("file")];
  if (!type) return c.notFound();
  const obj = await c.env.VIDEOS.get(`ffmpeg/${c.req.param("file")}`);
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=31536000, immutable",
      etag: obj.httpEtag,
    },
  });
});

export default app;
