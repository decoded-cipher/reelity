<script setup lang="ts">
import { ref, computed } from "vue";
import type { Job } from "../lib/types";

const props = defineProps<{ job: Job }>();
const emit = defineEmits<{ remix: [] }>();

const spec = computed(() => props.job.spec);
const assets = computed(() => props.job.assets);
const caption = computed(() => spec.value?.caption ?? "");
const accent = computed(() => spec.value?.accentColor ?? "#a855f7");
const gradient = computed(() => `radial-gradient(circle at 30% 20%, ${accent.value}, #0b0b12 72%)`);

const bgImage = computed(
  () =>
    assets.value?.background.poster ??
    (assets.value?.background.kind === "image" ? assets.value.background.url : undefined),
);
const gifUrl = computed(() => assets.value?.gif?.url);
const audio = computed(() => assets.value?.audio);

const handle = computed(
  () => "@" + (spec.value?.productName ?? "product").toLowerCase().replace(/[^a-z0-9]/g, ""),
);
const displayUrl = computed(() => {
  const u = props.job.videoUrl;
  if (u) return u.startsWith("http") ? u : `${location.origin}${u}`;
  return `${location.origin}/v/${props.job.id || "preview"}`;
});

const bgSource = computed(() => {
  const s = assets.value?.background.source;
  return s === "pexels" ? "pexels" : s === "og" ? "site" : "gradient";
});
const layers = computed(() => [
  { k: "clip", value: spec.value?.pexelsQuery ?? "", src: bgSource.value },
  { k: "gif", value: spec.value?.giphyQuery ?? "", src: gifUrl.value ? "giphy" : "—" },
  { k: "sound", value: audio.value?.title ?? spec.value?.audioVibe ?? "", src: audio.value ? "openverse" : "—" },
]);

const copied = ref(false);
async function copy() {
  await navigator.clipboard.writeText(displayUrl.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1400);
}
</script>

<template>
  <div class="w-full max-w-[27rem] rounded-[12px] border-2 border-[#0a0a0a] bg-white p-4 shadow-[5px_5px_0_0_#0a0a0a]">
    <div class="flex gap-4">
      <div class="relative aspect-[9/16] w-36 shrink-0 overflow-hidden rounded-[8px] border-2 border-[#0a0a0a] bg-black">
        <video
          v-if="job.videoUrl"
          :src="job.videoUrl"
          class="h-full w-full object-cover"
          controls
          playsinline
          loop
        />
        <template v-else>
          <img
            v-if="bgImage"
            :src="bgImage"
            alt=""
            class="anim-kenburns absolute inset-0 h-full w-full object-cover"
          />
          <div v-else class="anim-kenburns absolute inset-0" :style="{ background: gradient }" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

          <div class="absolute right-1.5 top-1.5 font-mono text-[8px] font-bold tracking-widest text-white/80">
            REELITY
          </div>

          <div class="anim-float absolute right-2 top-1/3 overflow-hidden rounded-[6px] border-2 border-white bg-black/40">
            <img v-if="gifUrl" :src="gifUrl" alt="" class="h-14 w-14 object-cover" />
            <div v-else class="px-2 py-2 text-center font-mono text-[8px] font-bold tracking-wider text-white/90">GIF</div>
          </div>

          <div class="absolute inset-x-2 top-[14%] text-center">
            <div class="text-balance text-xs font-black lowercase leading-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_0.9),_0_0_4px_rgb(0_0_0_/_0.9)]">
              {{ caption }}
            </div>
          </div>

          <div class="absolute inset-x-2 bottom-2">
            <div class="text-[10px] font-bold text-white">{{ handle }}</div>
            <div class="mt-0.5 h-0.5 w-full overflow-hidden bg-white/25">
              <div class="anim-scrub h-full bg-white/90" />
            </div>
          </div>
        </template>
      </div>

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-center gap-1.5">
          <span class="rounded-[5px] border-2 border-[#0a0a0a] bg-[#c6f000] px-1.5 py-px font-mono text-[10px] font-bold uppercase">
            {{ spec?.format }}
          </span>
          <span class="truncate font-display text-sm font-bold">{{ spec?.productName }}</span>
        </div>
        <p class="mt-2 text-[13px] leading-snug text-[#0a0a0a]/80">{{ job.concept }}</p>

        <div class="mt-3 space-y-1">
          <div
            v-for="l in layers"
            :key="l.k"
            class="flex items-center gap-1.5 text-[10px]"
          >
            <span class="w-12 shrink-0 rounded-[4px] border border-[#0a0a0a] bg-[#f5f2e9] px-1 py-px text-center font-mono font-bold uppercase">{{ l.k }}</span>
            <span class="truncate text-[#0a0a0a]/70">{{ l.value }}</span>
            <span class="ml-auto shrink-0 font-mono uppercase text-[#0a0a0a]/40">{{ l.src }}</span>
          </div>
        </div>

        <div class="mt-auto pt-3">
          <div class="flex items-center gap-1.5 rounded-[7px] border-2 border-[#0a0a0a] bg-[#f5f2e9] px-2 py-1.5">
            <span class="truncate font-mono text-[11px] text-[#0a0a0a]/70">{{ displayUrl }}</span>
            <button
              class="press ml-auto shrink-0 rounded-[5px] border-2 border-[#0a0a0a] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a]"
              @click="copy"
            >
              {{ copied ? "ok!" : "copy" }}
            </button>
          </div>
          <button
            class="press mt-2 inline-flex items-center gap-1.5 rounded-[7px] border-2 border-[#0a0a0a] bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#0a0a0a]"
            @click="emit('remix')"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.4">
              <path d="M21 2v6h-6M3 22v-6h6M21 8a9 9 0 0 0-15-3M3 16a9 9 0 0 0 15 3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            remix
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
