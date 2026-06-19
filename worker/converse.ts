import { generateText } from "ai";
import { sdkModel, workersAi } from "./brain";
import { normalizeUrl } from "./scrape";

export type Route = { action: "generate" } | { action: "chat"; reply: string };

const SYSTEM = [
  "You are Reelity, a friendly chat assistant that turns a product into a short UGC-style marketing video.",
  "Read the user's latest message and reply with ONLY a single minified JSON object — no markdown, no code fences:",
  '{"action":"generate"|"chat","reply":string}',
  'Choose "generate" only when the message gives a concrete product, app, brand, or website to make a video for — a URL or a clear product pitch. Set "reply" to "" in that case.',
  'Choose "chat" for greetings, small talk, thanks, or questions like "what can you do" — anything that is not a concrete product to promote. Write a warm, natural reply in 1-3 sentences.',
  "When chatting, make clear you create short-form UGC videos from a product URL or description, and invite them to share one with a link. Never invent a product; if unsure, choose chat and ask for the product and link.",
].join("\n");

export async function route(env: Env, message: string): Promise<Route> {
  try {
    const model = sdkModel(env);
    const raw = model
      ? (
          await generateText({
            model,
            system: SYSTEM,
            prompt: message,
            temperature: 0.7,
            maxOutputTokens: 300,
            abortSignal: AbortSignal.timeout(15000),
          })
        ).text
      : await workersAi(env, SYSTEM, message);
    const parsed = parseRoute(raw);
    if (parsed) return parsed;
  } catch {}
  return heuristicRoute(message);
}

function parseRoute(raw: string): Route | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as { action?: string; reply?: string };
    if (o.action === "generate") return { action: "generate" };
    if (o.action === "chat") return { action: "chat", reply: o.reply?.trim() || cannedReply("") };
    return null;
  } catch {
    return null;
  }
}

function heuristicRoute(message: string): Route {
  return looksLikeProduct(message)
    ? { action: "generate" }
    : { action: "chat", reply: cannedReply(message) };
}

function looksLikeProduct(message: string): boolean {
  if (normalizeUrl(message)) return true;
  return /\b(build(ing)?|launch(ing)?|made|created?|promot\w*|market\w*|advertis\w*|video for|reel for|my (app|product|brand|startup|company|site|website|saas|tool|platform))\b/i.test(
    message,
  );
}

function cannedReply(message: string): string {
  const m = message.toLowerCase();
  if (/\b(hi|hey|hello|yo|sup|howdy|gm|good (morning|afternoon|evening))\b/.test(m))
    return "Hey! 👋 I'm Reelity — I turn a product into a short, scroll-stopping UGC video. Tell me what you're building and drop a link, and I'll put one together.";
  if (/\b(thank|thanks|ty|appreciate)\b/.test(m))
    return "Anytime! Send a product and a link whenever you want a reel. 🎬";
  if (/\b(what|who|how|help|can you|do you)\b/.test(m))
    return 'I can generate UGC-style marketing videos for you! Share a product URL or a quick pitch — e.g. "CalAI, a calorie-tracking app: calai.app" — and I\'ll organize a background clip, kinetic captions, trending-style audio, and the perfect GIF into a vertical reel.';
  return 'I make short UGC-style videos from a product. Tell me what you\'re building and include a link — e.g. "CalAI, a calorie-tracking app: calai.app".';
}
