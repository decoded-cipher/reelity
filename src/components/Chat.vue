<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { nanoid } from "nanoid";
import type { ChatMessage } from "../lib/types";
import { send as sendMessage } from "../lib/api";
import { preloadFFmpeg } from "../lib/ffmpeg";
import MessageList from "./MessageList.vue";
import Composer from "./Composer.vue";

const messages = ref<ChatMessage[]>([]);
const busy = ref(false);

onMounted(() => preloadFFmpeg());

const isEmpty = computed(() => messages.value.length === 0);

async function send(text: string) {
  if (busy.value || !text.trim()) return;
  busy.value = true;

  messages.value.push({ id: nanoid(), role: "user", text, createdAt: Date.now() });
  messages.value.push({ id: nanoid(), role: "assistant", pending: true, createdAt: Date.now() });
  const live = messages.value[messages.value.length - 1];

  try {
    const result = await sendMessage(text, (job) => {
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
  }
}
</script>

<template>
  <div class="flex h-dvh flex-col text-[#0a0a0a]">
    <header class="shrink-0 border-b-2 border-[#0a0a0a] bg-white">
      <div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div class="flex items-center gap-2.5">
          <span class="font-display text-xl font-bold tracking-tight">REELITY</span>
          <span
            class="rounded-[5px] border-2 border-[#0a0a0a] bg-[#c6f000] px-1.5 py-px font-mono text-[10px] font-bold uppercase leading-tight"
          >
            ugc
          </span>
        </div>
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0a0a0a]/55">
          pitch in · reel out
        </span>
      </div>
    </header>

    <MessageList :messages="messages" @remix="send" />
    <Composer :busy="busy" :show-examples="isEmpty" @send="send" />
  </div>
</template>
