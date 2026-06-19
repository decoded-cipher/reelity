import type { Job } from "./types";
import { RENDER_STEPS } from "./steps";

const PROGRESS = [18, 48, 76, 95];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generate(message: string, onStep?: (job: Job) => void): Promise<Job> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`generate failed (${res.status})`);
  const final = (await res.json()) as Job;

  for (let i = 0; i < RENDER_STEPS.length; i++) {
    onStep?.({ ...final, status: RENDER_STEPS[i].key, progress: PROGRESS[i], videoUrl: undefined });
    await sleep(650 + Math.random() * 450);
  }
  onStep?.(final);
  return final;
}
