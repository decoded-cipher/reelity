<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { nanoid } from "nanoid";
import type { ChatMessage, ChatTurn } from "../lib/types";
import { send as sendMessage, resetSession } from "../lib/api";
import { preloadFFmpeg } from "../lib/ffmpeg";
import { initTurnstile } from "../lib/turnstile";
import MessageList from "./MessageList.vue";
import Composer from "./Composer.vue";

const STORAGE_KEY = "reelity.chat.v1";
const messages = ref<ChatMessage[]>([]);
const busy = ref(false);
const tsEl = ref<HTMLElement>();

onMounted(() => {
  preloadFFmpeg();
  if (tsEl.value) initTurnstile(tsEl.value);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) messages.value = (JSON.parse(raw) as ChatMessage[]).map((m) => ({ ...m, pending: false }));
  } catch {}
});

const isEmpty = computed(() => messages.value.length === 0);

function persist() {
  const keep = messages.value
    .map((m): ChatMessage | null => {
      if (m.role === "user") return m;
      if (m.pending) return null;
      // blob: URLs don't survive a reload — drop so the card falls back gracefully
      if (m.job?.videoUrl?.startsWith("blob:")) return { ...m, job: { ...m.job, videoUrl: undefined } };
      if (m.job && m.job.status !== "done" && m.job.status !== "failed") return null;
      return m.text || m.job ? m : null;
    })
    .filter((m): m is ChatMessage => m !== null);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keep));
  } catch {}
}

function clearChat() {
  messages.value = [];
  resetSession();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function buildHistory(): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages.value) {
    if (m.pending) continue;
    if (m.role === "user" && m.text) turns.push({ role: "user", content: m.text });
    else if (m.role === "assistant") {
      if (m.text) turns.push({ role: "assistant", content: m.text });
      else if (m.job?.spec) turns.push({ role: "assistant", content: `made a reel — caption: "${m.job.spec.caption}"` });
    }
  }
  return turns.slice(-8);
}

async function send(text: string) {
  if (busy.value || !text.trim()) return;
  busy.value = true;

  const history = buildHistory();
  messages.value.push({ id: nanoid(), role: "user", text, createdAt: Date.now() });
  messages.value.push({ id: nanoid(), role: "assistant", pending: true, createdAt: Date.now() });
  const live = messages.value[messages.value.length - 1];

  try {
    const result = await sendMessage(text, history, (job) => {
      live.pending = false;
      live.job = job;
    });
    if (result.kind === "reply") live.text = result.text;
    else live.job = result.job;
    live.pending = false;
  } catch (e) {
    live.pending = false;
    live.job = { id: nanoid(), status: "failed", progress: 0, error: (e as Error).message };
  } finally {
    busy.value = false;
    persist();
  }
}
</script>

<template>
  <div class="flex h-dvh flex-col text-[#0a0a0a]">
    <header class="shrink-0 border-b-2 border-[#0a0a0a] bg-white">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2.5">
          <span
            class="grid h-7 w-7 place-items-center rounded-[7px] border-2 border-[#0a0a0a] bg-[#c6f000] shadow-[2px_2px_0_0_#0a0a0a]"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5"><path d="M8 5 L8 19 L19 12 Z" fill="#0a0a0a" /></svg>
          </span>
          <span class="font-display text-xl font-bold tracking-tight">REELITY</span>
          <span
            class="rounded-[5px] border-2 border-[#0a0a0a] bg-[#c6f000] px-1.5 py-px font-mono text-[10px] font-bold uppercase leading-tight"
          >
            ugc
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="!isEmpty"
            class="press rounded-[6px] border-2 border-[#0a0a0a] bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a]"
            @click="clearChat"
          >
            new
          </button>
          <span class="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[#0a0a0a]/55 sm:inline">
            pitch in · reel out
          </span>
        </div>
      </div>
    </header>

    <MessageList :messages="messages" @remix="send" />
    <div ref="tsEl" class="mx-auto flex max-w-2xl justify-center px-4 empty:hidden" />
    <Composer :busy="busy" :show-examples="isEmpty" @send="send" />
  </div>
</template>
