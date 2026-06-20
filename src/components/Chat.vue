<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { nanoid } from "nanoid";
import type { ChatMessage, ChatTurn } from "../lib/types";
import { send as sendMessage } from "../lib/api";
import { preloadFFmpeg } from "../lib/ffmpeg";
import { initTurnstile } from "../lib/turnstile";
import { chatIdFromPath, newChatId, loadChat, saveChat } from "../lib/chats";
import MessageList from "./MessageList.vue";
import Composer from "./Composer.vue";

const messages = ref<ChatMessage[]>([]);
const busy = ref(false);
const tsEl = ref<HTMLElement>();
// the chat id lives in the URL (/c/:id); root "/" is always a fresh chat, minted on first send
const chatId = ref<string | null>(null);

function openFromUrl() {
  chatId.value = chatIdFromPath();
  messages.value = chatId.value ? loadChat(chatId.value) : [];
  updateTitle();
}

function updateTitle() {
  const first = messages.value.find((m) => m.role === "user" && m.text)?.text;
  document.title = first ? `${first.slice(0, 40)} · Reelity` : "Reelity — drop a link, get a reel";
}

onMounted(() => {
  preloadFFmpeg();
  if (tsEl.value) initTurnstile(tsEl.value);
  openFromUrl();
  window.addEventListener("popstate", openFromUrl);
});

onUnmounted(() => window.removeEventListener("popstate", openFromUrl));

const isEmpty = computed(() => messages.value.length === 0);

function persist() {
  if (!chatId.value) return;
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
  saveChat(chatId.value, keep);
}

function newChat() {
  if (location.pathname !== "/") history.pushState({}, "", "/");
  chatId.value = null;
  messages.value = [];
  updateTitle();
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

  if (!chatId.value) {
    chatId.value = newChatId();
    history.pushState({}, "", `/c/${chatId.value}`);
  }

  const turns = buildHistory();
  messages.value.push({ id: nanoid(), role: "user", text, createdAt: Date.now() });
  messages.value.push({ id: nanoid(), role: "assistant", pending: true, createdAt: Date.now() });
  const live = messages.value[messages.value.length - 1];
  updateTitle();

  try {
    const result = await sendMessage(text, turns, chatId.value, (job) => {
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
      <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <div class="flex items-center gap-2.5">
          <span
            class="grid h-7 w-7 place-items-center rounded-[7px] border-2 border-[#0a0a0a] bg-[#c6f000] shadow-[2px_2px_0_0_#0a0a0a]"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5"><path d="M8 5 L8 19 L19 12 Z" fill="#0a0a0a" /></svg>
          </span>
          <span class="font-display text-xl font-bold tracking-tight">REELITY</span>
        </div>
        <button
          v-if="!isEmpty"
          class="press flex items-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-[#c6f000] px-3 py-1.5 font-mono text-[11px] font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a] sm:px-4 sm:text-xs"
          @click="newChat"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="#0a0a0a" stroke-width="3">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          new chat
        </button>
      </div>
    </header>

    <MessageList :messages="messages" @remix="send" />
    <div ref="tsEl" class="mx-auto flex max-w-5xl justify-center px-5 empty:hidden" />
    <Composer :busy="busy" :show-examples="isEmpty" @send="send" />
  </div>
</template>
