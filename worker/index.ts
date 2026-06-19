import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Job } from "../src/lib/types";
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
    assets,
    concept: spec.concept,
  };
  return c.json({ kind: "job", job });
});

export default app;
