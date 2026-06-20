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
  <div class="shrink-0 border-t-2 border-[#0a0a0a] bg-white">
    <div class="mx-auto w-full max-w-5xl px-4 py-3 sm:px-5 sm:py-4">
      <div v-if="showExamples" class="mb-2.5 flex flex-wrap gap-2">
        <button
          v-for="(ex, i) in EXAMPLES"
          :key="ex"
          :disabled="busy"
          class="press rounded-[8px] border-2 border-[#0a0a0a] px-3 py-1.5 font-mono text-[13px] font-medium shadow-[2px_2px_0_0_#0a0a0a] sm:text-sm"
          :class="[i === 0 ? 'bg-[#c6f000]' : 'bg-white', i === 3 ? 'hidden sm:inline-block' : '']"
          @click="emit('send', ex)"
        >
          {{ ex }}
        </button>
      </div>

      <div
        class="flex items-end gap-2 rounded-[12px] border-[3px] border-[#0a0a0a] bg-white p-1.5 shadow-[4px_4px_0_0_#0a0a0a] transition-shadow focus-within:shadow-[6px_6px_0_0_#0a0a0a]"
      >
        <textarea
          ref="area"
          v-model="text"
          rows="1"
          :disabled="busy"
          placeholder="Tell me what you're building…"
          class="max-h-40 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-snug text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 focus:outline-none disabled:opacity-50"
          @input="resize"
          @keydown="onKeydown"
        />
        <button
          :disabled="!canSend"
          class="press grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border-2 border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-[2px_2px_0_0_#0a0a0a] disabled:cursor-not-allowed disabled:bg-[#0a0a0a]/30"
          @click="submit"
        >
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2.6">
            <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <p class="mt-2 hidden px-1 text-center font-mono text-[11px] uppercase tracking-widest text-[#0a0a0a]/45 sm:block">
        real clips · trend captions · sound · gif — rendered in your browser
      </p>
    </div>
  </div>
</template>
