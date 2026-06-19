<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { ChatMessage } from "../lib/types";
import ProgressSteps from "./ProgressSteps.vue";
import VideoCard from "./VideoCard.vue";

const props = defineProps<{ messages: ChatMessage[] }>();
const emit = defineEmits<{ remix: [text: string] }>();

const scroller = ref<HTMLElement>();

watch(
  () =>
    props.messages
      .map((m) => `${m.id}:${m.job?.status}:${m.job?.progress}:${m.pending}:${m.text ? 1 : 0}`)
      .join("|"),
  async () => {
    await nextTick();
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: "smooth" });
  },
);

const running = (m: ChatMessage) =>
  !!m.job && m.job.status !== "done" && m.job.status !== "failed";

function remix(i: number) {
  const prev = props.messages[i - 1];
  if (prev?.text) emit("remix", prev.text);
}
</script>

<template>
  <div ref="scroller" class="flex-1 overflow-y-auto">
    <div
      v-if="!messages.length"
      class="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 text-center"
    >
      <h1
        class="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-6xl font-black tracking-tight text-transparent"
      >
        Reelity
      </h1>
      <p class="mt-3 text-zinc-400">turn your reality into a reel.</p>
      <p class="mt-6 max-w-md text-sm leading-relaxed text-zinc-500">
        Tell me what you're building and drop a link. I'll read the site and organize a
        scroll-stopping UGC reel — background, kinetic captions, trending-style audio, and the
        perfect GIF.
      </p>
    </div>

    <div v-else class="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <template v-for="(m, i) in messages" :key="m.id">
        <div v-if="m.role === 'user'" class="flex justify-end">
          <div
            class="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm text-white shadow-lg shadow-fuchsia-500/10"
          >
            {{ m.text }}
          </div>
        </div>

        <div v-else class="flex justify-start">
          <div
            v-if="m.pending"
            class="flex items-center gap-1 rounded-2xl rounded-bl-md bg-zinc-800/70 px-4 py-3.5"
          >
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
            <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
          </div>
          <ProgressSteps v-else-if="running(m)" :job="m.job!" />
          <VideoCard
            v-else-if="m.job && m.job.status === 'done'"
            :job="m.job"
            @remix="remix(i)"
          />
          <div
            v-else-if="m.job && m.job.status === 'failed'"
            class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            Couldn't build that reel — {{ m.job.error }}
          </div>
          <div
            v-else-if="m.text"
            class="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-zinc-800/70 px-4 py-2.5 text-sm leading-relaxed text-zinc-100"
          >
            {{ m.text }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
