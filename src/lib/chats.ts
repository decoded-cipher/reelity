import { nanoid } from "nanoid";
import type { ChatMessage } from "./types";

export function chatIdFromPath(): string | null {
  const m = location.pathname.match(/^\/c\/([A-Za-z0-9_-]+)\/?$/);
  return m ? m[1] : null;
}

export const newChatId = (): string => nanoid();

export interface ChatLoad {
  status: "ok" | "not-found" | "error";
  messages: ChatMessage[];
}

export async function fetchChat(id: string): Promise<ChatLoad> {
  try {
    const res = await fetch(`/api/thread/${id}`);
    if (res.status === 404) return { status: "not-found", messages: [] };
    if (!res.ok) return { status: "error", messages: [] };
    const data = (await res.json()) as { messages?: ChatMessage[] };
    return { status: "ok", messages: (data.messages ?? []).map((m) => ({ ...m, pending: false })) };
  } catch {
    return { status: "error", messages: [] };
  }
}
