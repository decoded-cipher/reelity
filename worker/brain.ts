import { generateText, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Caption, RenderSpec } from "../src/lib/types";
import type { SiteContext } from "./scrape";

const TEMPLATES = ["pov", "rating", "nobody", "beforeafter", "listicle"] as const;
type Template = (typeof TEMPLATES)[number];

const DEFAULTS = {
  anthropic: "claude-opus-4-8",
  google: "gemini-2.0-flash",
  workersAi: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};

export async function buildSpec(
  env: Env,
  message: string,
  site: SiteContext | null,
): Promise<RenderSpec> {
  const { system, user } = buildPrompt(message, site);
  try {
    const model = sdkModel(env);
    const raw = model
      ? (
          await generateText({
            model,
            system,
            prompt: user,
            temperature: 0.9,
            maxOutputTokens: 1024,
            abortSignal: AbortSignal.timeout(20000),
          })
        ).text
      : await workersAi(env, system, user);
    const spec = coerceSpec(raw, message, site);
    if (spec) return spec;
  } catch {}
  return heuristicSpec(message, site);
}

function sdkModel(env: Env): LanguageModel | null {
  const id = env.BRAIN_MODEL;
  const make = {
    anthropic: () => createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(id || DEFAULTS.anthropic),
    google: () =>
      createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })(id || DEFAULTS.google),
  };
  const want = env.BRAIN_PROVIDER?.toLowerCase();
  if (want === "anthropic" || want === "google") return make[want]();
  if (env.ANTHROPIC_API_KEY) return make.anthropic();
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) return make.google();
  return null;
}

type TextAI = {
  run(
    model: string,
    input: { messages: { role: string; content: string }[]; max_tokens?: number },
  ): Promise<{ response?: string }>;
};

async function workersAi(env: Env, system: string, user: string): Promise<string> {
  const ai = env.AI as unknown as TextAI;
  const out = await ai.run(env.WORKERS_AI_MODEL || DEFAULTS.workersAi, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 1024,
  });
  return out.response ?? "";
}

function buildPrompt(message: string, site: SiteContext | null) {
  const system = [
    "You are a viral short-form video scriptwriter for TikTok, Reels, and Shorts.",
    "Given a product, design ONE 5-8 second vertical UGC-style video that is genuinely funny or clever and feels native to current short-form trends — the kind a creator would actually post and people would screenshot.",
    "You do not generate footage. You ORGANIZE four layers: a background b-roll clip, kinetic on-screen captions, a trending-style audio vibe, and a reaction GIF that is the punchline. The GIF must land the joke.",
    "",
    "Reply with ONLY a single minified JSON object — no markdown, no code fences, no commentary. Shape:",
    '{"template": one of ["pov","rating","nobody","beforeafter","listicle"],',
    '"productName": string, "siteUrl": string,',
    '"concept": one sentence describing the bit,',
    '"caption": [{"text": short on-screen line, "startMs": int, "endMs": int}],',
    '"pexelsQuery": 2-4 words for the background clip,',
    '"giphyQuery": search for the punchline reaction GIF,',
    '"audioVibe": short phrase for the trending audio mood,',
    '"accentColor": "#RRGGBB" matching the brand}',
    "",
    "Rules: 3 to 4 caption beats. Each line punchy (max ~6 words). Times in milliseconds, non-overlapping, covering roughly 0 to 6000. Lowercase trendy phrasing and at most one emoji per line are fine. Make the humor specific to THIS product — reference what it actually does. No corporate slogans, no generic hype.",
  ].join("\n");

  const user = [`Founder's pitch: "${message}"`, "", siteSummary(site), "", "Write the video."].join("\n");
  return { system, user };
}

function siteSummary(site: SiteContext | null): string {
  if (!site) return "No website was provided — infer the product from the pitch.";
  return [
    `URL: ${site.url}`,
    site.title && `Title: ${site.title}`,
    site.ogTitle && site.ogTitle !== site.title && `OG title: ${site.ogTitle}`,
    site.description && `Description: ${site.description}`,
    site.ogDescription && site.ogDescription !== site.description && `OG description: ${site.ogDescription}`,
    site.text && `Page text: ${site.text}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function coerceSpec(raw: string, message: string, site: SiteContext | null): RenderSpec | null {
  const json = extractJson(raw);
  if (!json) return null;
  const caption = coerceCaptions(json.caption);
  if (!caption) return null;

  const name = str(json.productName) || extractProductName(message, site?.host ?? "");
  const url = str(json.siteUrl) || site?.url || (site?.host ? `https://${site.host}` : "");
  const themeHex = site?.themeColor ? hex(site.themeColor) : undefined;
  return {
    template: TEMPLATES.includes(json.template as Template) ? (json.template as Template) : "pov",
    productName: name,
    siteUrl: url,
    concept: str(json.concept) || `${name} UGC reel`,
    caption,
    pexelsQuery: str(json.pexelsQuery) || "aesthetic lifestyle b-roll",
    giphyQuery: str(json.giphyQuery) || "excited reaction",
    audioVibe: str(json.audioVibe) || "upbeat trending",
    accentColor: hex(json.accentColor) || themeHex || "#a855f7",
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function coerceCaptions(input: unknown): Caption[] | null {
  if (!Array.isArray(input)) return null;
  const lines: { text: string; startMs?: number; endMs?: number }[] = [];
  for (const it of input) {
    if (typeof it === "string") {
      if (it.trim()) lines.push({ text: it.trim() });
    } else if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      const text = str(o.text);
      if (text) lines.push({ text, startMs: num(o.startMs), endMs: num(o.endMs) });
    }
  }
  const picked = lines.slice(0, 5);
  if (picked.length < 2) return null;

  const timed = picked.every((l) => l.startMs !== undefined && l.endMs !== undefined);
  return timed
    ? picked.map((l) => ({ text: l.text, startMs: l.startMs!, endMs: l.endMs! }))
    : beats(picked.map((l) => l.text));
}

function heuristicSpec(message: string, site: SiteContext | null): RenderSpec {
  const name = extractProductName(message, site?.host ?? "");
  const host = site?.host ?? `${slug(name)}.app`;
  const url = site?.url ?? `https://${host}`;
  return pick(CONCEPTS)(name, url, host);
}

function extractProductName(message: string, host: string): string {
  const building = message.match(/building\s+([a-z][\w.&'-]*)/i);
  if (building) return building[1].replace(/[.,]+$/, "");
  const root = host.split(".")[0];
  if (root) return root.charAt(0).toUpperCase() + root.slice(1);
  return message.match(/\b([A-Z][a-zA-Z0-9]{2,})\b/)?.[1] ?? "your product";
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : undefined);
const hex = (v: unknown) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : undefined;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function beats(lines: string[], totalMs = 6000): Caption[] {
  const each = Math.round(totalMs / lines.length);
  return lines.map((text, i) => ({ text, startMs: i * each, endMs: (i + 1) * each }));
}

type Concept = (name: string, url: string, host: string) => RenderSpec;

const CONCEPTS: Concept[] = [
  (name, url) => ({
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
  (name, url, host) => ({
    template: "nobody",
    productName: name,
    siteUrl: url,
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
  (name, url, host) => ({
    template: "rating",
    productName: name,
    siteUrl: url,
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
