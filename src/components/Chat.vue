<script setup lang="ts">
import { ref, computed } from "vue";
import type { ChatMessage } from "../lib/types";
import { generate } from "../lib/api";
import MessageList from "./MessageList.vue";
import Composer from "./Composer.vue";

const messages = ref<ChatMessage[]>([]);
const busy = ref(false);

const uid = () => Math.random().toString(36).slice(2);
const isEmpty = computed(() => messages.value.length === 0);

async function send(text: string) {
  if (busy.value || !text.trim()) return;
  busy.value = true;

  messages.value.push({ id: uid(), role: "user", text, createdAt: Date.now() });
  const reply: ChatMessage = {
    id: uid(),
    role: "assistant",
    job: { id: "", status: "queued", progress: 0 },
    createdAt: Date.now(),
  };
  messages.value.push(reply);

  try {
    reply.job = await generate(text, (job) => {
      reply.job = job;
    });
  } catch (e) {
    reply.job = { id: uid(), status: "failed", progress: 0, error: (e as Error).message };
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
