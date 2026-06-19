import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderSpec, ResolvedAssets } from "./types";

const W = 1080;
const H = 1920;
const FPS = 30;
const DURATION = 8;

const here = dirname(fileURLToPath(import.meta.url));
const FONT = process.env.REELITY_FONT || join(here, "..", "assets", "fonts", "Inter-Bold.ttf");

export interface AssembleResult {
  outPath: string;
  durationSec: number;
}

export async function assemble(
  spec: RenderSpec,
  assets: ResolvedAssets,
  outPath: string,
): Promise<AssembleResult> {
  const tmp = await mkdtemp(join(tmpdir(), "reelity-"));
  try {
    const lines = wrapCaption(spec.caption);
    const lineFiles = await Promise.all(
      lines.map(async (line, i) => {
        const p = join(tmp, `l${i}.txt`);
        await writeFile(p, line);
        return p;
      }),
    );

    const bg = assets.background;
    const heroVideo =
      bg.kind === "video" && bg.url ? await tryDownload(bg.url, join(tmp, "hero.mp4")) : null;
    const heroImage =
      !heroVideo && bg.kind === "image" && (bg.url || bg.poster)
        ? await tryDownload((bg.url || bg.poster)!, join(tmp, "hero.img"))
        : null;
    const gifPath = assets.gif?.url ? await tryDownload(assets.gif.url, join(tmp, "gif.gif")) : null;
    const audioPath = assets.audio?.url
      ? await tryDownload(assets.audio.url, join(tmp, "audio.mp3"))
      : null;

    const accent = (spec.accentColor || "#a855f7").replace("#", "0x");
    const fullFrameGif = spec.format === "reaction" && !heroVideo && !heroImage && !!gifPath;

    const args = ["-y", "-hide_banner", "-loglevel", "error"];
    let idx = 0;
    const addInput = (...a: string[]) => {
      args.push(...a);
      return idx++;
    };

    const fc: string[] = [];
    let label: string;

    if (heroVideo) {
      const i = addInput("-stream_loop", "-1", "-i", heroVideo);
      fc.push(`[${i}:v]${fill()},setsar=1[bg]`);
      label = "bg";
    } else if (heroImage) {
      const i = addInput("-loop", "1", "-i", heroImage);
      fc.push(`[${i}:v]${fill()},${kenBurns()},setsar=1[bg]`);
      label = "bg";
    } else if (fullFrameGif) {
      const i = addInput("-ignore_loop", "0", "-i", gifPath!);
      fc.push(`[${i}:v]${fill()},setsar=1[bg]`);
      label = "bg";
    } else {
      const i = addInput(
        "-f",
        "lavfi",
        "-i",
        `gradients=s=${W}x${H}:c0=${accent}:c1=0x0b0b12:duration=${DURATION}:speed=0.01:rate=${FPS}`,
      );
      fc.push(`[${i}:v]setsar=1[bg]`);
      label = "bg";
    }

    if (spec.format === "composite" && gifPath && !fullFrameGif) {
      const gi = addInput("-ignore_loop", "0", "-i", gifPath);
      fc.push(`[${gi}:v]scale=${Math.round(W * 0.6)}:-1[gif]`);
      fc.push(`[${label}][gif]overlay=(W-w)/2:H*0.46[ov]`);
      label = "ov";
    }

    fc.push(`[${label}]${captionFilter(lines, lineFiles)}[v]`);

    const aIdx = audioPath
      ? addInput("-stream_loop", "-1", "-i", audioPath)
      : addInput("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");

    args.push(
      "-filter_complex",
      fc.join(";"),
      "-map",
      "[v]",
      "-map",
      `${aIdx}:a`,
      "-t",
      String(DURATION),
      "-r",
      String(FPS),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      "-shortest",
      outPath,
    );

    await runFfmpeg(args);
    return { outPath, durationSec: DURATION };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const fill = () => `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
const kenBurns = () =>
  `zoompan=z='min(zoom+0.0008,1.12)':d=${DURATION * FPS}:s=${W}x${H}:fps=${FPS}`;

function captionFilter(lines: string[], lineFiles: string[]): string {
  const fontsize = lines.length >= 4 ? 50 : lines.length === 3 ? 56 : 64;
  const lineH = Math.round(fontsize * 1.3);
  return lines
    .map(
      (_, i) =>
        `drawtext=fontfile='${FONT}':textfile='${lineFiles[i]}':fontcolor=white:fontsize=${fontsize}:borderw=7:bordercolor=black@0.9:x=(w-text_w)/2:y=(h*0.15)+${i * lineH}`,
    )
    .join(",");
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

async function tryDownload(url: string, dest: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return dest;
  } catch {
    return null;
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn(process.env.FFMPEG_PATH || "ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    ff.stderr.on("data", (d) => (err += d.toString()));
    ff.on("error", reject);
    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-800)}`)),
    );
  });
}
