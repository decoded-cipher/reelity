import { Hono } from "hono";
import type { Job } from "../src/lib/types";
import { buildSpec } from "./brain";
import { normalizeUrl, scrapeSite } from "./scrape";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/generate", async (c) => {
  const { message } = await c.req.json<{ message?: string }>();
  if (!message?.trim()) return c.json({ error: "message required" }, 400);

  const url = normalizeUrl(message);
  const site = url ? await scrapeSite(url) : null;
  const spec = await buildSpec(c.env, message.trim(), site);

  const job: Job = { id: crypto.randomUUID(), status: "done", progress: 100, spec, concept: spec.concept };
  return c.json(job);
});

export default app;
