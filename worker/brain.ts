import { generateText, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { RenderSpec } from "../src/lib/types";
import type { SiteContext } from "./scrape";

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

export function sdkModel(env: Env): LanguageModel | null {
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

export async function workersAi(env: Env, system: string, user: string): Promise<string> {
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
    "Given a product, design ONE 5-10 second vertical UGC-style video that is genuinely funny or clever and feels native to current short-form trends — the kind a creator would actually post and people would screenshot.",
    "You do not generate footage. You ORGANIZE assets: a hero clip or GIF, ONE static on-screen caption, and a trending-style audio bed.",
    "",
    "Reply with ONLY a single minified JSON object — no markdown, no code fences, no commentary. Shape:",
    '{"format": "reaction" | "composite",',
    '"productName": string, "siteUrl": string,',
    '"concept": one sentence describing the bit,',
    '"caption": one short meme-style on-screen line,',
    '"reactionQuery": 2-4 words to find a relatable reaction person/clip,',
    '"pexelsQuery": 2-4 words for a scenic background clip,',
    '"giphyQuery": search for a reaction GIF,',
    '"audioVibe": short phrase for the trending audio mood,',
    '"accentColor": "#RRGGBB" matching the brand}',
    "",
    'The caption is the whole joke. Write ONE relatable line in a current meme frame — "me when…", "pov:", "nobody:", "when you…" — that name-drops the product and pokes at what it actually does. Lowercase, casual, max ~12 words, at most one emoji.',
    'Pick "reaction" for most pitches (a full-frame reaction clip carries it); pick "composite" when a scenic background with a small reaction GIF on top fits the bit better.',
    "Make the humor specific to THIS product. No corporate slogans, no generic hype.",
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
  const caption = coerceCaption(json.caption);
  if (!caption) return null;

  const name = str(json.productName) || extractProductName(message, site?.host ?? "");
  const url = str(json.siteUrl) || site?.url || (site?.host ? `https://${site.host}` : "");
  const themeHex = site?.themeColor ? hex(site.themeColor) : undefined;
  return {
    format: json.format === "composite" ? "composite" : "reaction",
    productName: name,
    siteUrl: url,
    concept: str(json.concept) || `${name} UGC reel`,
    caption,
    reactionQuery: str(json.reactionQuery) || "person reacting excited",
    pexelsQuery: str(json.pexelsQuery) || "aesthetic lifestyle b-roll",
    giphyQuery: str(json.giphyQuery) || "excited reaction",
    audioVibe: str(json.audioVibe) || "upbeat trending",
    accentColor: hex(json.accentColor) || themeHex || "#a855f7",
  };
}

function coerceCaption(input: unknown): string | null {
  if (typeof input === "string") return str(input) ?? null;
  if (Array.isArray(input)) {
    const joined = input
      .map((it) =>
        typeof it === "string"
          ? it
          : it && typeof it === "object"
            ? str((it as Record<string, unknown>).text)
            : undefined,
      )
      .filter(Boolean)
      .join(" ");
    return str(joined) ?? null;
  }
  return null;
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
const hex = (v: unknown) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim() : undefined;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type Concept = (name: string, url: string, host: string) => RenderSpec;

const CONCEPTS: Concept[] = [
  (name, url, host) => ({
    format: "reaction",
    productName: name,
    siteUrl: url,
    concept: `POV reaction to discovering ${name}`,
    caption: `me acting normal until someone asks how i use ${host}`,
    reactionQuery: "man nodding impressed",
    pexelsQuery: "person using phone aesthetic",
    giphyQuery: "impressed nod",
    audioVibe: "upbeat phonk",
    accentColor: "#a855f7",
  }),
  (name, url) => ({
    format: "reaction",
    productName: name,
    siteUrl: url,
    concept: `"nobody:" flex meme about ${name}`,
    caption: `nobody: … me explaining why everyone needs ${name}`,
    reactionQuery: "person talking fast explaining",
    pexelsQuery: "excited person talking to camera",
    giphyQuery: "talking explaining hands",
    audioVibe: "viral comedy sting",
    accentColor: "#ec4899",
  }),
  (name, url) => ({
    format: "composite",
    productName: name,
    siteUrl: url,
    concept: `chill flex — ${name} does the work`,
    caption: `when ${name} just handles it and i do absolutely nothing`,
    reactionQuery: "person relaxing satisfied",
    pexelsQuery: "calm aesthetic sky sunset",
    giphyQuery: "relaxed chill vibe",
    audioVibe: "lofi flex beat",
    accentColor: "#22d3ee",
  }),
];
