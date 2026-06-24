<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { GalleryItem } from "../lib/types";

const props = defineProps<{ item: GalleryItem }>();

const accent = computed(() => props.item.spec?.accentColor ?? "#a855f7");
const showDetails = ref(false);

const details = computed(() => {
  const s = props.item.spec;
  return [
    { k: "model", v: props.item.model ?? "" },
    { k: "format", v: props.item.format ?? "" },
    { k: "concept", v: props.item.concept ?? s?.concept ?? "" },
    { k: "reaction", v: s?.reactionQuery ?? "" },
    { k: "bg query", v: s?.pexelsQuery ?? "" },
    { k: "gif query", v: s?.giphyQuery ?? "" },
    { k: "audio", v: props.item.audioTitle ?? s?.audioVibe ?? "" },
    { k: "site", v: s?.siteUrl ?? "" },
  ].filter((d) => d.v);
});

const videoEl = ref<HTMLVideoElement>();
let io: IntersectionObserver | undefined;

onMounted(() => {
  const el = videoEl.value;
  if (!el) return;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      }
    },
    { threshold: 0.5 },
  );
  io.observe(el);
});

onUnmounted(() => io?.disconnect());
</script>

<template>
  <div class="flex flex-col rounded-[12px] border-2 border-[#0a0a0a] bg-white p-3 shadow-[4px_4px_0_0_#0a0a0a]">
    <div class="relative aspect-[9/16] w-full overflow-hidden rounded-[8px] border-2 border-[#0a0a0a] bg-black">
      <video
        ref="videoEl"
        :src="item.videoUrl"
        :poster="item.poster ?? undefined"
        class="h-full w-full object-cover"
        muted
        loop
        playsinline
        preload="metadata"
        controls
      />
    </div>

    <div class="mt-3 flex items-center gap-1.5">
      <span class="shrink-0 rounded-[5px] border-2 border-[#0a0a0a] bg-[#c6f000] px-1.5 py-px font-mono text-[10px] font-bold uppercase">
        {{ item.format }}
      </span>
      <span class="truncate font-display text-sm font-bold">{{ item.productName }}</span>
    </div>
    <p v-if="item.caption" class="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug lowercase">
      {{ item.caption }}
    </p>

    <button
      class="mt-2 flex w-full items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a0a0a]/60"
      @click="showDetails = !showDetails"
    >
      <span>{{ showDetails ? "▾" : "▸" }} what the ai picked</span>
      <span class="inline-block h-3.5 w-3.5 rounded-[3px] border border-[#0a0a0a]" :style="{ background: accent }" />
    </button>
    <div v-if="showDetails" class="mt-2 space-y-1 rounded-[7px] border-2 border-[#0a0a0a] bg-[#f5f2e9] p-2.5">
      <div v-for="d in details" :key="d.k" class="flex gap-2 text-[12px]">
        <span class="w-20 shrink-0 font-mono font-bold uppercase text-[#0a0a0a]/45">{{ d.k }}</span>
        <span class="min-w-0 flex-1 break-words text-[#0a0a0a]/85">{{ d.v }}</span>
      </div>
    </div>
  </div>
</template>
