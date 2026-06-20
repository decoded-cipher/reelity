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
    <div class="mx-auto w-full max-w-2xl px-4 py-3">
      <div v-if="showExamples" class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="(ex, i) in EXAMPLES"
          :key="ex"
          :disabled="busy"
          class="press rounded-[7px] border-2 border-[#0a0a0a] px-3 py-1.5 font-mono text-xs font-medium shadow-[2px_2px_0_0_#0a0a0a]"
          :class="i === 0 ? 'bg-[#c6f000]' : 'bg-white'"
          @click="emit('send', ex)"
        >
          {{ ex }}
        </button>
      </div>

      <div
        class="flex items-end gap-2 rounded-[10px] border-2 border-[#0a0a0a] bg-white p-2 shadow-[3px_3px_0_0_#0a0a0a] transition-shadow focus-within:shadow-[5px_5px_0_0_#0a0a0a]"
      >
        <textarea
          ref="area"
          v-model="text"
          rows="1"
          :disabled="busy"
          placeholder="describe your product and drop a link…"
          class="max-h-48 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[#0a0a0a] placeholder:text-[#0a0a0a]/40 focus:outline-none disabled:opacity-50"
          @input="resize"
          @keydown="onKeydown"
        />
        <button
          :disabled="!canSend"
          class="press grid h-9 w-9 shrink-0 place-items-center rounded-[7px] border-2 border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-[2px_2px_0_0_#0a0a0a] disabled:cursor-not-allowed"
          @click="submit"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.4">
            <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <p class="mt-2 px-1 text-center font-mono text-[10px] uppercase tracking-widest text-[#0a0a0a]/45">
        real clips · trend captions · sound · gif — rendered in your browser
      </p>
    </div>
  </div>
</template>
