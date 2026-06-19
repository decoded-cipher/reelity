export type Role = "user" | "assistant";

export type JobStatus =
  | "queued"
  | "scraping"
  | "thinking"
  | "sourcing"
  | "rendering"
  | "done"
  | "failed";

export interface Caption {
  text: string;
  startMs: number;
  endMs: number;
}

export interface RenderSpec {
  template: string;
  productName: string;
  siteUrl: string;
  concept: string;
  caption: Caption[];
  pexelsQuery: string;
  giphyQuery: string;
  audioVibe: string;
  accentColor: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  spec?: RenderSpec;
  videoUrl?: string;
  poster?: string;
  concept?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text?: string;
  job?: Job;
  createdAt: number;
}
