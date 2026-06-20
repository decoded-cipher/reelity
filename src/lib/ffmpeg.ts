import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { Job } from "./types";

const W = 720;
const H = 1280;
const FPS = 30;
const DUR = 8;
const CORE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let fontReady: Promise<void> | null = null;

export function preloadFFmpeg(): void {
  void getFFmpeg();
  void ensureFont();
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      const ff = new FFmpeg();
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ff.load({ coreURL, wasmURL });
      instance = ff;
      return ff;
    })();
  }
  return loading;
}

function ensureFont(): Promise<void> {
  if (!fontReady) {
    fontReady = (async () => {
      const face = new FontFace("ReelityInter", "url(/Inter-Bold.ttf)");
      await face.load();
      document.fonts.add(face);
    })();
  }
  return fontReady;
}

export interface RenderOptions {
  onProgress?: (ratio: number) => void;
}

export async function renderJob(job: Job, opts: RenderOptions = {}): Promise<Blob> {
  const spec = job.spec;
  const assets = job.assets;
  if (!spec || !assets) throw new Error("job missing spec/assets");

  const ff = await getFFmpeg();
  const onProgress = ({ progress }: { progress: number }) =>
    opts.onProgress?.(Math.min(1, Math.max(0, progress)));
  ff.on("progress", onProgress);

  try {
    await ff.writeFile("caption.png", await captionPng(spec.caption));

    const inputs: string[][] = [];
    const add = (...a: string[]) => inputs.push(a) - 1;
    const bg = assets.background;
    let heroIsGif = false;
    let bgIdx: number;

    // A single flaky asset must not kill the render: bg falls back to a gradient,
    // the GIF and audio are simply dropped if their proxy fetch fails.
    const videoBytes = bg.kind === "video" && bg.url ? await tryFetch(bg.url) : null;
    const imageBytes =
      !videoBytes && bg.kind === "image" && (bg.url || bg.poster)
        ? await tryFetch((bg.url || bg.poster)!)
        : null;
    const gifBytes = assets.gif ? await tryFetch(assets.gif.url) : null;

    if (videoBytes) {
      await ff.writeFile("hero", videoBytes);
      bgIdx = add("-stream_loop", "-1", "-i", "hero");
    } else if (imageBytes) {
      await ff.writeFile("hero", imageBytes);
      bgIdx = add("-loop", "1", "-i", "hero");
    } else if (gifBytes) {
      await ff.writeFile("hero.gif", gifBytes);
      bgIdx = add("-ignore_loop", "0", "-i", "hero.gif");
      heroIsGif = true;
    } else {
      await ff.writeFile("bg.png", await gradientPng(spec.accentColor || "#a855f7"));
      bgIdx = add("-loop", "1", "-i", "bg.png");
    }

    // The GIF is the punchline — keep it on top whenever it isn't already the backdrop.
    let overlayIdx = -1;
    if (gifBytes && !heroIsGif) {
      await ff.writeFile("ov.gif", gifBytes);
      overlayIdx = add("-ignore_loop", "0", "-i", "ov.gif");
    }

    const capIdx = add("-i", "caption.png");

    let audioIdx = -1;
    if (assets.audio?.url) {
      const audioBytes = await tryFetch(assets.audio.url);
      if (audioBytes) {
        await ff.writeFile("audio.mp3", audioBytes);
        audioIdx = add("-stream_loop", "-1", "-i", "audio.mp3");
      }
    }

    const fc: string[] = [
      `[${bgIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`,
    ];
    let base = "bg";
    if (overlayIdx >= 0) {
      fc.push(`[${overlayIdx}:v]scale=${Math.round(W * 0.64)}:-1[g]`);
      fc.push(`[bg][g]overlay=(W-w)/2:H*0.5[ov]`);
      base = "ov";
    }
    fc.push(`[${base}][${capIdx}:v]overlay=0:0:eof_action=repeat[v]`);

    const args = ["-y", ...inputs.flat(), "-filter_complex", fc.join(";"), "-map", "[v]"];
    if (audioIdx >= 0) args.push("-map", `${audioIdx}:a`);
    args.push(
      "-t", String(DUR),
      "-r", String(FPS),
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "26",
      "-pix_fmt", "yuv420p",
    );
    if (audioIdx >= 0) args.push("-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", "-shortest");
    args.push("-movflags", "+faststart", "out.mp4");

    const code = await ff.exec(args);
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    const data = (await ff.readFile("out.mp4")) as Uint8Array;
    return new Blob([new Uint8Array(data).buffer], { type: "video/mp4" });
  } finally {
    ff.off("progress", onProgress);
  }
}

async function tryFetch(url: string): Promise<Uint8Array | null> {
  try {
    return await fetchFile(url);
  } catch {
    return null;
  }
}

async function captionPng(text: string): Promise<Uint8Array> {
  await ensureFont();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const lines = wrapCaption(text);
  const fs = lines.length >= 4 ? 40 : lines.length === 3 ? 46 : 52;
  const lh = Math.round(fs * 1.28);

  ctx.font = `${fs}px ReelityInter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(5, Math.round(fs * 0.18));
  ctx.strokeStyle = "rgba(0,0,0,0.92)";
  ctx.fillStyle = "#ffffff";

  let y = Math.round(H * 0.15);
  for (const line of lines) {
    ctx.strokeText(line, W / 2, y);
    ctx.fillText(line, W / 2, y);
    y += lh;
  }
  return canvasBytes(canvas);
}

async function gradientPng(accent: string): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, H * 0.95);
  g.addColorStop(0, accent);
  g.addColorStop(1, "#0b0b12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return canvasBytes(canvas);
}

function canvasBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error("canvas toBlob failed"));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

function wrapCaption(text: string, maxChars = 20, maxLines = 4): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines;
  const head = lines.slice(0, maxLines - 1);
  head.push(lines.slice(maxLines - 1).join(" "));
  return head;
}
