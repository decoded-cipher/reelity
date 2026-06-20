export type Role = "user" | "assistant";

export type JobStatus =
  | "queued"
  | "scraping"
  | "thinking"
  | "sourcing"
  | "rendering"
  | "done"
  | "failed";

export type VideoFormat = "reaction" | "composite";

export interface RenderSpec {
  format: VideoFormat;
  productName: string;
  siteUrl: string;
  concept: string;
  caption: string;
  reactionQuery: string;
  pexelsQuery: string;
  giphyQuery: string;
  audioVibe: string;
  accentColor: string;
}

export interface BackgroundAsset {
  kind: "video" | "image" | "gradient";
  url?: string;
  poster?: string;
  source: "pexels" | "og" | "gradient";
}

export interface GifAsset {
  url: string;
  source: "giphy" | "fallback";
}

export interface AudioAsset {
  url: string;
  title: string;
  vibe: string;
  attribution?: string;
}

export interface ResolvedAssets {
  background: BackgroundAsset;
  gif: GifAsset | null;
  audio: AudioAsset | null;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  spec?: RenderSpec;
  assets?: ResolvedAssets;
  videoUrl?: string;
  concept?: string;
  model?: string;
  error?: string;
}

export interface ChatTurn {
  role: Role;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text?: string;
  job?: Job;
  pending?: boolean;
  createdAt: number;
}
