import { nanoid } from "nanoid";
import type { Job } from "./types";
import { renderJob } from "./ffmpeg";

export type SendResult = { kind: "reply"; text: string } | { kind: "job"; job: Job };

const SESSION_KEY = "reelity.session.v1";

function sessionId(): string {
  try {
    let s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      s = nanoid();
      localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

export function resetSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export async function send(message: string, onStep?: (job: Job) => void): Promise<SendResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, sessionId: sessionId() }),
  });
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  const data = (await res.json()) as SendResult;
  if (data.kind === "reply") return data;

  const job = data.job;
  onStep?.({ ...job, status: "rendering", progress: 5, videoUrl: undefined });

  try {
    const blob = await renderJob(job, {
      onProgress: (r) =>
        onStep?.({ ...job, status: "rendering", progress: Math.min(92, Math.round(8 + r * 84)) }),
    });
    onStep?.({ ...job, status: "rendering", progress: 96 });
    const up = await fetch(`/api/videos/${job.id}.mp4`, {
      method: "PUT",
      headers: { "content-type": "video/mp4" },
      body: blob,
    });
    const videoUrl = up.ok ? ((await up.json()) as { url: string }).url : URL.createObjectURL(blob);
    const done: Job = { ...job, status: "done", progress: 100, videoUrl };
    onStep?.(done);
    return { kind: "job", job: done };
  } catch (e) {
    const failed: Job = { ...job, status: "done", progress: 100, error: (e as Error).message };
    onStep?.(failed);
    return { kind: "job", job: failed };
  }
}
