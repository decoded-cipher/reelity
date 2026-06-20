<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { nanoid } from "nanoid";
import type { ChatMessage, ChatTurn } from "../lib/types";
import { send as sendMessage } from "../lib/api";
import { preloadFFmpeg } from "../lib/ffmpeg";
import { initTurnstile } from "../lib/turnstile";
import { chatIdFromPath, newChatId, loadChat, saveChat, fetchChat } from "../lib/chats";
import MessageList from "./MessageList.vue";
import Composer from "./Composer.vue";

const messages = ref<ChatMessage[]>([]);
const busy = ref(false);
const tsEl = ref<HTMLElement>();
const chatId = ref<string | null>(null);

async function openFromUrl() {
  const id = chatIdFromPath();
  chatId.value = id;
  if (!id) {
    messages.value = [];
    updateTitle();
    return;
  }
  const local = loadChat(id);
  messages.value = local;
  updateTitle();
  if (!local.length) {
    const remote = await fetchChat(id);
    if (chatId.value === id && remote.length) {
      messages.value = remote;
      saveChat(id, remote);
      updateTitle();
    }
  }
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
        <button
          type="button"
          class="flex items-center gap-2.5 transition-opacity hover:opacity-70"
          aria-label="Start a new chat"
          title="New chat"
          @click="newChat"
        >
          <span
            class="grid h-7 w-7 place-items-center rounded-[7px] border-2 border-[#0a0a0a] bg-[#c6f000] shadow-[2px_2px_0_0_#0a0a0a]"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5"><path d="M8 5 L8 19 L19 12 Z" fill="#0a0a0a" /></svg>
          </span>
          <span class="font-display text-xl font-bold tracking-tight">REELITY</span>
        </button>
        <div class="flex items-center gap-2">
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
          <a
            href="https://github.com/decoded-cipher/reelity"
            target="_blank"
            rel="noopener"
            aria-label="View source on GitHub"
            title="View source on GitHub"
            class="press flex items-center justify-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-white shadow-[2px_2px_0_0_#0a0a0a]"
            :class="isEmpty ? 'px-3 py-1.5 sm:px-4' : 'h-9 w-9'"
          >
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px] shrink-0" fill="#0a0a0a" aria-hidden="true">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
            <span v-if="isEmpty" class="font-mono text-[11px] font-bold uppercase sm:text-xs">github</span>
          </a>
        </div>
      </div>
    </header>

    <MessageList :messages="messages" @remix="send" />
    <div ref="tsEl" class="mx-auto flex max-w-5xl justify-center px-5 empty:hidden" />
    <Composer :busy="busy" :show-examples="isEmpty" @send="send" />
  </div>
</template>
