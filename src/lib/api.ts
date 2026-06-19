import type { Job } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generate(message: string, onStep?: (job: Job) => void): Promise<Job> {
  onStep?.({ id: "", status: "scraping", progress: 14 });

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`generate failed (${res.status})`);
  const final = (await res.json()) as Job;

  const stages = [
    { status: "thinking", progress: 48 },
    { status: "sourcing", progress: 76 },
    { status: "rendering", progress: 95 },
  ] as const;
  for (const s of stages) {
    onStep?.({ ...final, status: s.status, progress: s.progress, videoUrl: undefined });
    await sleep(650 + Math.random() * 400);
  }

  onStep?.(final);
  return final;
}
