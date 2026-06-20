import { nanoid } from "nanoid";
import type { ChatMessage } from "./types";

const PREFIX = "reelity.chat.";

export function chatIdFromPath(): string | null {
  const m = location.pathname.match(/^\/c\/([A-Za-z0-9_-]+)\/?$/);
  return m ? m[1] : null;
}

export const newChatId = (): string => nanoid();

export function loadChat(id: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (raw) return (JSON.parse(raw) as ChatMessage[]).map((m) => ({ ...m, pending: false }));
  } catch {}
  return [];
}

export function saveChat(id: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(messages));
  } catch {}
}

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
