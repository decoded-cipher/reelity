import type { AudioAsset, BackgroundAsset, GifAsset, RenderSpec, ResolvedAssets } from "../src/lib/types";
import type { SiteContext } from "./scrape";

export async function resolveAssets(
  env: Env,
  spec: RenderSpec,
  site: SiteContext | null,
): Promise<ResolvedAssets> {
  const [background, gif, audio] = await Promise.all([
    resolveBackground(env, spec, site),
    resolveGif(env, spec),
    openverseAudio(spec.audioVibe),
  ]);
  return { background, gif, audio };
}

async function resolveBackground(
  env: Env,
  spec: RenderSpec,
  site: SiteContext | null,
): Promise<BackgroundAsset> {
  const key = env.PEXELS_API_KEY;
  if (key) {
    const found =
      (await pexelsVideo(key, spec.pexelsQuery, "portrait")) ??
      (await pexelsVideo(key, spec.pexelsQuery, "landscape")) ??
      (await pexelsPhoto(key, spec.pexelsQuery));
    if (found) return found;
  }
  if (site?.ogImage) return { kind: "image", url: site.ogImage, poster: site.ogImage, source: "og" };
  return { kind: "gradient", source: "gradient" };
}

interface PexelsVideoFile {
  file_type: string;
  link: string;
  width: number;
  height: number;
}
interface PexelsVideo {
  image: string;
  video_files: PexelsVideoFile[];
}
interface PexelsPhoto {
  src: Record<string, string>;
}

async function pexelsVideo(
  key: string,
  query: string,
  orientation: "portrait" | "landscape",
): Promise<BackgroundAsset | null> {
  const data = await fetchJson<{ videos?: PexelsVideo[] }>(
    `https://api.pexels.com/videos/search?query=${enc(query)}&orientation=${orientation}&size=medium&per_page=8`,
    { headers: { Authorization: key } },
  );
  const video = sample(data?.videos);
  if (!video) return null;
  const file = bestVideoFile(video.video_files);
  if (!file) return null;
  return { kind: "video", url: file.link, poster: video.image, source: "pexels" };
}

async function pexelsPhoto(key: string, query: string): Promise<BackgroundAsset | null> {
  const data = await fetchJson<{ photos?: PexelsPhoto[] }>(
    `https://api.pexels.com/v1/search?query=${enc(query)}&orientation=portrait&per_page=8`,
    { headers: { Authorization: key } },
  );
  const photo = sample(data?.photos);
  if (!photo) return null;
  const url = photo.src.portrait || photo.src.large2x || photo.src.large || photo.src.original;
  if (!url) return null;
  return { kind: "image", url, poster: photo.src.medium || url, source: "pexels" };
}

function bestVideoFile(files: PexelsVideoFile[]): PexelsVideoFile | null {
  const mp4 = (files ?? []).filter((f) => f.file_type === "video/mp4");
  if (!mp4.length) return null;
  const tall = mp4.sort((a, b) => a.height - b.height);
  return tall.find((f) => f.height >= 900) ?? tall[tall.length - 1];
}

interface GiphyGif {
  images: Record<string, { url?: string }>;
}

async function resolveGif(env: Env, spec: RenderSpec): Promise<GifAsset | null> {
  const key = env.GIPHY_API_KEY;
  if (!key) return null;
  const data = await fetchJson<{ data?: GiphyGif[] }>(
    `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${enc(spec.giphyQuery)}&limit=12&rating=pg-13&bundle=messaging_non_clips`,
  );
  const gif = sample(data?.data);
  const url = gif?.images.original?.url || gif?.images.downsized_large?.url;
  return url ? { url, source: "giphy" } : null;
}

interface OpenverseAudio {
  title?: string;
  creator?: string;
  url?: string;
  attribution?: string;
  alt_files?: { url?: string }[];
}

async function openverseAudio(vibe: string): Promise<AudioAsset | null> {
  const words = vibe.toLowerCase().match(/[a-z]+/g) ?? [];
  const queries = [...new Set([vibe, ...words])].slice(0, 3);
  for (const q of queries) {
    const data = await fetchJson<{ results?: OpenverseAudio[] }>(
      `https://api.openverse.org/v1/audio/?q=${enc(q)}&page_size=20&category=music&license_type=commercial,modification`,
      { headers: { "user-agent": "Reelity/1.0 (+https://reelity.app)" } },
    );
    const track = sample(data?.results);
    const url = track?.url || track?.alt_files?.[0]?.url;
    if (track && url) {
      return {
        url,
        title: track.title || "Untitled track",
        vibe,
        attribution: track.attribution || track.creator || undefined,
      };
    }
  }
  return null;
}

async function fetchJson<T>(url: string, init: RequestInit = {}, ms = 6000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const enc = encodeURIComponent;
const sample = <T>(arr?: T[]): T | undefined =>
  arr?.length ? arr[Math.floor(Math.random() * Math.min(arr.length, 8))] : undefined;
