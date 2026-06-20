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
  <div class="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
    <header class="shrink-0 border-b border-white/5 px-4 py-3">
      <div class="mx-auto flex max-w-2xl items-center gap-2">
        <span class="text-lg">🎬</span>
        <span
          class="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text font-black tracking-tight text-transparent"
        >
          Reelity
        </span>
      </div>
    </header>

    <MessageList :messages="messages" @remix="send" />
    <Composer :busy="busy" :show-examples="isEmpty" @send="send" />
  </div>
</template>
