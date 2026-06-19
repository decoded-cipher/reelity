export interface SiteContext {
  url: string;
  host: string;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  themeColor?: string;
  text: string;
}

export function normalizeUrl(message: string): string | undefined {
  const match =
    message.match(/https?:\/\/[^\s]+/i)?.[0] ??
    message.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?/i)?.[0];
  if (!match) return undefined;
  const cleaned = match.replace(/[.,)\]]+$/, "");
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

const clean = (s?: string) => s?.replace(/\s+/g, " ").trim();

export async function scrapeSite(url: string, timeoutMs = 5000): Promise<SiteContext> {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = url;
  }
  const ctx: SiteContext = { url, host, text: "" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ReelityBot/1.0; +https://reelity.app)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return ctx;

    const meta = (name: string, set: (v: string) => void) => ({
      element(e: Element) {
        const v = e.getAttribute("content");
        if (v) set(v);
      },
    });

    let budget = 1400;
    const push = (s: string, last: boolean) => {
      if (budget <= 0) return;
      ctx.text += s;
      budget -= s.length;
      if (last) ctx.text += " ";
    };

    const rewriter = new HTMLRewriter()
      .on("title", { text: (t) => void (ctx.title = (ctx.title ?? "") + t.text) })
      .on('meta[name="description"]', meta("description", (v) => (ctx.description ??= v)))
      .on('meta[property="og:title"]', meta("og:title", (v) => (ctx.ogTitle ??= v)))
      .on('meta[property="og:description"]', meta("og:description", (v) => (ctx.ogDescription ??= v)))
      .on('meta[property="og:image"]', meta("og:image", (v) => (ctx.ogImage ??= v)))
      .on('meta[name="theme-color"]', meta("theme-color", (v) => (ctx.themeColor ??= v)))
      .on("h1, h2, h3, p, li", {
        text: (t) => push(t.text, t.lastInTextNode),
      });

    await rewriter.transform(res).arrayBuffer();
  } catch {
    return ctx;
  } finally {
    clearTimeout(timer);
  }

  ctx.title = clean(ctx.title);
  ctx.description = clean(ctx.description);
  ctx.ogDescription = clean(ctx.ogDescription);
  ctx.text = clean(ctx.text)?.slice(0, 1400) ?? "";
  return ctx;
}
