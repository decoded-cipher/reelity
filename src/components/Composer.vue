<script setup lang="ts">
import { ref, computed, nextTick } from "vue";

const props = defineProps<{ busy: boolean; showExamples?: boolean }>();
const emit = defineEmits<{ send: [text: string] }>();

const text = ref("");
const area = ref<HTMLTextAreaElement>();

const EXAMPLES = [
  "What can you do?",
  "I'm building CalAI, a calorie-tracking app: calai.app",
  "Notion but for plumbers — pipeline.app",
  "DripCheck, an AI stylist for your closet: dripcheck.io",
];

const canSend = computed(() => !props.busy && text.value.trim().length > 0);

function submit() {
  if (!canSend.value) return;
  emit("send", text.value.trim());
  text.value = "";
  nextTick(resize);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}

function resize() {
  const el = area.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}
</script>

<template>
  <div class="shrink-0 border-t border-white/5 bg-zinc-950/80 backdrop-blur">
    <div class="mx-auto w-full max-w-2xl px-4 py-3">
      <div v-if="showExamples" class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="ex in EXAMPLES"
          :key="ex"
          :disabled="busy"
          class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-40"
          @click="emit('send', ex)"
        >
          {{ ex }}
        </button>
      </div>

      <div
        class="flex items-end gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-2 transition focus-within:border-violet-400/40"
      >
        <textarea
          ref="area"
          v-model="text"
          rows="1"
          :disabled="busy"
          placeholder="Message Reelity… or describe your product and drop a link"
          class="max-h-48 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
          @input="resize"
          @keydown="onKeydown"
        />
        <button
          :disabled="!canSend"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
          @click="submit"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <p class="mt-2 px-1 text-center text-[11px] text-zinc-600">
        Reelity organizes real clips, captions, audio &amp; GIFs into a vertical reel.
      </p>
    </div>
  </div>
</template>
