<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { ChatMessage } from "../lib/types";
import ProgressSteps from "./ProgressSteps.vue";
import VideoCard from "./VideoCard.vue";

const props = defineProps<{ messages: ChatMessage[] }>();
const emit = defineEmits<{ remix: [text: string] }>();

const layers = [
  { n: "01", name: "Clip", desc: "real background b-roll" },
  { n: "02", name: "Caption", desc: "trend-native meme line" },
  { n: "03", name: "Sound", desc: "trending audio bed" },
  { n: "04", name: "GIF", desc: "the punchline, on top" },
];

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
      class="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-5 py-12"
    >
      <span
        class="brut mb-6 w-fit px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-widest"
      >
        ai-organized — not ai-generated
      </span>
      <h1 class="font-display text-6xl font-extrabold leading-[0.88] tracking-tight sm:text-8xl">
        drop a link.<br />
        get a
        <span class="inline-block -rotate-1 border-[3px] border-[#0a0a0a] bg-[#c6f000] px-3 leading-none shadow-[5px_5px_0_0_#0a0a0a]">
          reel.
        </span>
      </h1>
      <p class="mt-7 max-w-xl text-lg leading-relaxed text-[#0a0a0a]/75 sm:text-xl">
        Reelity reads your product's site and assembles a vertical, scroll-stopping UGC video —
        then drops the link right here in chat. One message, done.
      </p>

      <div class="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="l in layers" :key="l.n" class="brut p-3.5">
          <div class="font-mono text-[11px] font-bold text-[#0a0a0a]/40">{{ l.n }}</div>
          <div class="mt-1.5 font-display text-lg font-bold leading-none">{{ l.name }}</div>
          <div class="mt-1 text-[12px] leading-snug text-[#0a0a0a]/60">{{ l.desc }}</div>
        </div>
      </div>

      <p class="mt-8 font-mono text-xs uppercase tracking-widest text-[#0a0a0a]/45">
        ↓ try an example below
      </p>
    </div>

    <div v-else class="mx-auto max-w-5xl space-y-5 px-5 py-6">
      <template v-for="(m, i) in messages" :key="m.id">
        <div v-if="m.role === 'user'" class="flex justify-end">
          <div
            class="max-w-[80%] whitespace-pre-wrap rounded-[10px] border-2 border-[#0a0a0a] bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white shadow-[3px_3px_0_0_#0a0a0a]"
          >
            {{ m.text }}
          </div>
        </div>

        <div v-else class="flex justify-start">
          <div
            v-if="m.pending"
            class="flex items-center gap-1.5 rounded-[10px] border-2 border-[#0a0a0a] bg-white px-4 py-3.5 shadow-[3px_3px_0_0_#0a0a0a]"
          >
            <span class="h-2 w-2 animate-bounce rounded-full bg-[#0a0a0a] [animation-delay:0ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-[#0a0a0a] [animation-delay:150ms]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-[#0a0a0a] [animation-delay:300ms]" />
          </div>
          <ProgressSteps v-else-if="running(m)" :job="m.job!" />
          <VideoCard
            v-else-if="m.job && m.job.status === 'done'"
            :job="m.job"
            @remix="remix(i)"
          />
          <div
            v-else-if="m.job && m.job.status === 'failed'"
            class="rounded-[10px] border-2 border-[#0a0a0a] bg-[#ff5a3c] px-4 py-3 text-sm font-semibold text-[#0a0a0a] shadow-[3px_3px_0_0_#0a0a0a]"
          >
            couldn't build that reel — {{ m.job.error }}
          </div>
          <div
            v-else-if="m.text"
            class="max-w-[80%] whitespace-pre-wrap rounded-[10px] border-2 border-[#0a0a0a] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#0a0a0a] shadow-[3px_3px_0_0_#0a0a0a]"
          >
            {{ m.text }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
