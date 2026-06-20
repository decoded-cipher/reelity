import { nanoid } from "nanoid";
import type { ChatMessage } from "./types";

export function chatIdFromPath(): string | null {
  const m = location.pathname.match(/^\/c\/([A-Za-z0-9_-]+)\/?$/);
  return m ? m[1] : null;
}

export const newChatId = (): string => nanoid();

export async function fetchChat(id: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`/api/thread/${id}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: ChatMessage[] };
    return (data.messages ?? []).map((m) => ({ ...m, pending: false }));
  } catch {
    return [];
  }
}
