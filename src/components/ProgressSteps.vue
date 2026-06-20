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
  <div class="w-full max-w-sm rounded-[10px] border-2 border-[#0a0a0a] bg-white p-4 shadow-[3px_3px_0_0_#0a0a0a]">
    <ul class="space-y-2.5">
      <li v-for="(step, i) in RENDER_STEPS" :key="step.key" class="flex items-center gap-3">
        <span
          class="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border-2 border-[#0a0a0a]"
          :class="{
            'bg-[#c6f000]': state(i) === 'done',
            'bg-white': state(i) === 'active',
            'bg-transparent opacity-30': state(i) === 'pending',
          }"
        >
          <svg v-if="state(i) === 'done'" viewBox="0 0 24 24" class="h-3 w-3 text-[#0a0a0a]" fill="none" stroke="currentColor" stroke-width="3.5">
            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span v-else-if="state(i) === 'active'" class="anim-spin h-3 w-3 rounded-full border-2 border-[#0a0a0a]/20 border-t-[#0a0a0a]" />
        </span>
        <span
          class="text-sm font-medium transition-colors"
          :class="state(i) === 'pending' ? 'text-[#0a0a0a]/35' : 'text-[#0a0a0a]'"
        >
          {{ step.label }}
        </span>
      </li>
    </ul>

    <div class="mt-4 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
      <span class="flex items-center gap-1.5">
        <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a0a0a]" />
        {{ RENDER_STEPS[Math.min(current, RENDER_STEPS.length - 1)]?.label ?? "working" }}…
      </span>
      <span>{{ job.progress }}%</span>
    </div>
    <div class="mt-1.5 h-3 w-full overflow-hidden rounded-[5px] border-2 border-[#0a0a0a] bg-white">
      <div
        class="h-full bg-[#c6f000] transition-all duration-500 ease-out"
        :style="{ width: `${job.progress}%` }"
      />
    </div>
  </div>
</template>
