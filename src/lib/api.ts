import type { Job } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SendResult = { kind: "reply"; text: string } | { kind: "job"; job: Job };

export async function send(message: string, onStep?: (job: Job) => void): Promise<SendResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  const data = (await res.json()) as SendResult;

  if (data.kind === "reply") return data;

  const final = data.job;
  const stages = [
    { status: "scraping", progress: 18 },
    { status: "thinking", progress: 48 },
    { status: "sourcing", progress: 76 },
    { status: "rendering", progress: 95 },
  ] as const;
  for (const s of stages) {
    onStep?.({ ...final, status: s.status, progress: s.progress, videoUrl: undefined });
    await sleep(600 + Math.random() * 350);
  }
  onStep?.(final);
  return { kind: "job", job: final };
}
