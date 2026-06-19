<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { Job } from "../lib/types";

const props = defineProps<{ job: Job }>();
const emit = defineEmits<{ remix: [] }>();

const spec = computed(() => props.job.spec);
const captions = computed(() => spec.value?.caption ?? []);
const accent = computed(() => spec.value?.accentColor ?? "#a855f7");
const host = computed(() =>
  (spec.value?.siteUrl || "yoursite.com").replace(/^https?:\/\//, "").split("/")[0],
);
const handle = computed(
  () => "@" + (spec.value?.productName ?? "product").toLowerCase().replace(/[^a-z0-9]/g, ""),
);
const displayUrl = computed(
  () => props.job.videoUrl ?? `${location.origin}/v/${props.job.id || "preview"}`,
);

const layers = computed(() => [
  { icon: "🎬", label: "BG", value: spec.value?.pexelsQuery ?? "" },
  { icon: "🪩", label: "GIF", value: spec.value?.giphyQuery ?? "" },
  { icon: "🎵", label: "Audio", value: spec.value?.audioVibe ?? "" },
]);

const idx = ref(0);
let timer: number | undefined;
onMounted(() => {
  timer = window.setInterval(() => {
    if (captions.value.length) idx.value = (idx.value + 1) % captions.value.length;
  }, 1500);
});
onBeforeUnmount(() => clearInterval(timer));

const copied = ref(false);
async function copy() {
  await navigator.clipboard.writeText(displayUrl.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1400);
}
</script>

<template>
  <div class="w-full max-w-[26rem] rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
    <div class="flex gap-4">
      <div
        class="relative aspect-[9/16] w-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15"
      >
        <video
          v-if="job.videoUrl"
          :src="job.videoUrl"
          class="h-full w-full object-cover"
          controls
          playsinline
        />
        <template v-else>
          <div
            class="anim-kenburns absolute inset-0"
            :style="{ background: `radial-gradient(circle at 30% 20%, ${accent}, #0b0b12 72%)` }"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

          <div class="absolute right-2 top-2 text-[8px] font-semibold tracking-widest text-white/70">
            REELITY
          </div>

          <div
            class="anim-float absolute right-2 top-1/3 rotate-6 rounded-lg border-2 border-white/80 bg-black/40 px-2 py-1 text-center shadow-lg"
          >
            <div class="text-lg leading-none">{{ layers[1].value.includes('kiss') ? '😘' : '🤯' }}</div>
            <div class="text-[7px] font-bold tracking-wider text-white/80">GIF</div>
          </div>

          <div class="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center">
            <div
              :key="idx"
              class="anim-pop text-balance text-sm font-black uppercase leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
            >
              {{ captions[idx]?.text }}
            </div>
          </div>

          <div class="absolute inset-x-2 bottom-2">
            <div class="mb-1 flex items-center gap-1 text-[8px] text-white/80">
              <span>🎵</span><span class="truncate">{{ spec?.audioVibe }}</span>
            </div>
            <div class="text-[10px] font-bold text-white">{{ handle }}</div>
            <div class="h-0.5 w-full overflow-hidden rounded-full bg-white/25">
              <div class="anim-scrub h-full bg-white/90" />
            </div>
          </div>
        </template>
      </div>

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
          {{ spec?.template }} · {{ spec?.productName }}
        </div>
        <p class="mt-1 text-sm leading-snug text-zinc-200">{{ job.concept }}</p>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="l in layers"
            :key="l.label"
            class="inline-flex max-w-full items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400"
          >
            <span>{{ l.icon }}</span>
            <span class="truncate">{{ l.value }}</span>
          </span>
        </div>

        <div class="mt-auto pt-3">
          <div class="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
            <span class="truncate font-mono text-[11px] text-zinc-400">{{ displayUrl }}</span>
            <button
              class="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-300 transition hover:bg-white/10"
              @click="copy"
            >
              {{ copied ? "Copied!" : "Copy" }}
            </button>
          </div>
          <button
            class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/10"
            @click="emit('remix')"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6M3 22v-6h6M21 8a9 9 0 0 0-15-3M3 16a9 9 0 0 0 15 3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Remix
          </button>
        </div>
      </div>
    </div>

    <p class="mt-3 text-[11px] text-zinc-600">Animated preview of your concept.</p>
  </div>
</template>
