import type { ChatTurn, Job, JobStatus } from "./types";
import { renderJob } from "./ffmpeg";
import { getTurnstileToken } from "./turnstile";

export type SendResult = { kind: "reply"; text: string } | { kind: "job"; job: Job };

export async function send(
  message: string,
  history: ChatTurn[],
  sessionId: string,
  onStep?: (job: Job) => void,
): Promise<SendResult> {
  const turnstileToken = await getTurnstileToken();

  // staged "what's happening now" while the server scrapes + scripts + sources
  const stages: JobStatus[] = ["scraping", "thinking", "sourcing"];
  let si = 0;
  onStep?.({ id: "", status: stages[0], progress: 12 });
  const ticker = setInterval(() => {
    si = Math.min(si + 1, stages.length - 1);
    onStep?.({ id: "", status: stages[si], progress: 12 + si * 12 });
  }, 1400);

  let data: SendResult;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, sessionId, turnstileToken, history }),
    });
    if (!res.ok) throw new Error(res.status === 403 ? "bot check failed — refresh and retry" : `request failed (${res.status})`);
    data = (await res.json()) as SendResult;
  } finally {
    clearInterval(ticker);
  }
  if (data.kind === "reply") return data;

  const job = data.job;
  onStep?.({ ...job, status: "rendering", progress: 50 });
  try {
    const blob = await renderJob(job, {
      onProgress: (r) =>
        onStep?.({ ...job, status: "rendering", progress: Math.min(95, 50 + Math.round(r * 45)) }),
    });
    onStep?.({ ...job, status: "rendering", progress: 97 });
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
