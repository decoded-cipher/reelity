<script setup lang="ts">
import { computed } from "vue";
import type { Job, JobStatus } from "../lib/types";
import { RENDER_STEPS } from "../lib/steps";

const props = defineProps<{ job: Job }>();

const ORDER: JobStatus[] = ["scraping", "thinking", "sourcing", "rendering"];
const current = computed(() =>
  props.job.status === "done" ? RENDER_STEPS.length : ORDER.indexOf(props.job.status),
);

function state(i: number): "done" | "active" | "pending" {
  if (i < current.value) return "done";
  if (i === current.value) return "active";
  return "pending";
}
</script>

<template>
  <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
    <ul class="space-y-3">
      <li v-for="(step, i) in RENDER_STEPS" :key="step.key" class="flex items-center gap-3">
        <span
          class="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]"
          :class="{
            'border-emerald-400/50 bg-emerald-400/10 text-emerald-300': state(i) === 'done',
            'border-violet-400/50 bg-violet-400/10': state(i) === 'active',
            'border-white/10 text-zinc-600': state(i) === 'pending',
          }"
        >
          <svg v-if="state(i) === 'done'" viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span v-else-if="state(i) === 'active'" class="anim-spin h-3 w-3 rounded-full border-2 border-violet-300/30 border-t-violet-300" />
        </span>
        <span
          class="text-sm transition-colors"
          :class="state(i) === 'pending' ? 'text-zinc-600' : 'text-zinc-200'"
        >
          {{ step.label }}
        </span>
      </li>
    </ul>

    <div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        class="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
        :style="{ width: `${job.progress}%` }"
      />
    </div>
  </div>
</template>
