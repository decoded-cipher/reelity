import type { JobStatus } from "./types";

export interface RenderStep {
  key: Extract<JobStatus, "scraping" | "thinking" | "sourcing" | "rendering">;
  label: string;
}

export const RENDER_STEPS: RenderStep[] = [
  { key: "scraping", label: "Reading the site" },
  { key: "thinking", label: "Scripting the concept" },
  { key: "sourcing", label: "Sourcing background + GIF" },
  { key: "rendering", label: "Rendering your reel" },
];
