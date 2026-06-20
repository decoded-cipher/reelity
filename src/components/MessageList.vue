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
      class="mx-auto flex h-full max-w-2xl flex-col justify-center px-4 py-10"
    >
      <span
        class="brut mb-5 w-fit px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest"
      >
        ai-organized · not ai-generated
      </span>
      <h1 class="font-display text-5xl font-bold leading-[0.92] tracking-tight sm:text-[64px]">
        turn a link<br />
        into a
        <span class="inline-block -rotate-1 border-2 border-[#0a0a0a] bg-[#c6f000] px-2 leading-none shadow-[3px_3px_0_0_#0a0a0a]">
          reel.
        </span>
      </h1>
      <p class="mt-6 max-w-md text-[15px] leading-relaxed text-[#0a0a0a]/70">
        Paste a product pitch and a link. I read the site and assemble a vertical UGC video — real
        clip, trend caption, sound, and the punchline GIF — then drop it right here.
      </p>
      <p class="mt-5 font-mono text-[11px] uppercase tracking-widest text-[#0a0a0a]/45">
        ↓ try one below
      </p>
    </div>

    <div v-else class="mx-auto max-w-2xl space-y-5 px-4 py-6">
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
