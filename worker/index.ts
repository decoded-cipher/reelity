import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Job, ResolvedAssets } from "../src/lib/types";
import { buildSpec } from "./brain";
import { route } from "./converse";
import { resolveAssets } from "./assets";
import { normalizeUrl, scrapeSite } from "./scrape";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/chat", async (c) => {
  const { message } = await c.req.json<{ message?: string }>();
  if (!message?.trim()) return c.json({ error: "message required" }, 400);
  const text = message.trim();

  const decision = await route(c.env, text);
  if (decision.action === "chat") return c.json({ kind: "reply", text: decision.reply });

  const url = normalizeUrl(text);
  const site = url ? await scrapeSite(url) : null;
  const spec = await buildSpec(c.env, text, site);
  const assets = await resolveAssets(c.env, spec, site);

  const job: Job = {
    id: nanoid(),
    status: "done",
    progress: 100,
    spec,
    assets: proxify(assets),
    concept: spec.concept,
  };
  return c.json({ kind: "job", job });
});

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
  await c.env.VIDEOS.put(key, c.req.raw.body, { httpMetadata: { contentType: "video/mp4" } });
  return c.json({ url: `/v/${key}` });
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

export default app;
