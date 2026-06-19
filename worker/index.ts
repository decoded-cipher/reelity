import { Hono } from "hono";
import type { Caption, Job, RenderSpec } from "../src/lib/types";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/generate", async (c) => {
  const { message } = await c.req.json<{ message?: string }>();
  if (!message?.trim()) return c.json({ error: "message required" }, 400);
  return c.json(mockJob(message));
});

export default app;

function mockJob(message: string): Job {
  const url = extractUrl(message) ?? "";
  const name = extractProductName(message, url);
  const host = (url || `${slug(name)}.app`).replace(/^https?:\/\//, "").split("/")[0];
  const spec = pick(CONCEPTS)(name, url || `https://${host}`, host);
  return { id: crypto.randomUUID(), status: "done", progress: 100, spec, concept: spec.concept };
}

function extractUrl(message: string): string | undefined {
  const m =
    message.match(/https?:\/\/[^\s]+/i) ??
    message.match(/\b[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
  return m?.[0]?.replace(/[.,]+$/, "");
}

function extractProductName(message: string, url: string): string {
  const building = message.match(/building\s+([a-z][\w.&'-]*)/i);
  if (building) return building[1].replace(/[.,]+$/, "");
  if (url) {
    const root = url.replace(/^https?:\/\//, "").split(/[./]/)[0];
    if (root) return root.charAt(0).toUpperCase() + root.slice(1);
  }
  const cap = message.match(/\b([A-Z][a-zA-Z0-9]{2,})\b/);
  return cap?.[1] ?? "your product";
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function beats(lines: string[], totalMs = 6000): Caption[] {
  const each = Math.round(totalMs / lines.length);
  return lines.map((text, i) => ({ text, startMs: i * each, endMs: (i + 1) * each }));
}

type Concept = (name: string, url: string, host: string) => RenderSpec;

const CONCEPTS: Concept[] = [
  (name, url, host) => ({
    template: "pov",
    productName: name,
    siteUrl: url,
    concept: `POV: you finally found ${name} after trying every other app`,
    caption: beats([
      "POV: you've tried every app for this",
      "they all kinda… sucked",
      `then ${name} pulled up`,
      "ok this one actually slaps 🔥",
    ]),
    pexelsQuery: "person scrolling phone aesthetic",
    giphyQuery: "mind blown reaction",
    audioVibe: "upbeat phonk",
    accentColor: "#a855f7",
  }),
  (name, _url, host) => ({
    template: "nobody",
    productName: name,
    siteUrl: _url,
    concept: `"nobody: … ${name} users:" flex meme`,
    caption: beats([
      "nobody:",
      "absolutely nobody:",
      `${name} users explaining the glow-up:`,
      `${host} — see for yourself`,
    ]),
    pexelsQuery: "excited person talking to camera",
    giphyQuery: "talking fast explaining",
    audioVibe: "viral comedy sting",
    accentColor: "#ec4899",
  }),
  (name, _url, host) => ({
    template: "rating",
    productName: name,
    siteUrl: _url,
    concept: `rating apps until I hit a 10/10 — spoiler, it's ${name}`,
    caption: beats([
      "rating the apps I tried this week",
      "that one? 4/10 😬",
      `${name}? a clean 10/10`,
      `${host} ⭐️⭐️⭐️⭐️⭐️`,
    ]),
    pexelsQuery: "aesthetic desk setup laptop",
    giphyQuery: "chefs kiss perfect",
    audioVibe: "lofi flex beat",
    accentColor: "#22d3ee",
  }),
];
