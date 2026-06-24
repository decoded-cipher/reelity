<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { GalleryItem } from "../lib/types";
import { downloadVideo } from "../lib/share";
import ShareModal from "./ShareModal.vue";

const props = defineProps<{ item: GalleryItem }>();

const accent = computed(() => props.item.spec?.accentColor ?? "#a855f7");
const showDetails = ref(false);
const showShare = ref(false);
const copied = ref(false);

const product = computed(() => props.item.productName ?? props.item.spec?.productName ?? "reelity");
const slug = computed(() => product.value.toLowerCase().replace(/[^a-z0-9]/g, "") || "reelity");
const downloadName = computed(() => `${slug.value}-reel.mp4`);
const shareUrl = computed(() =>
  props.item.videoUrl.startsWith("http") ? props.item.videoUrl : `${location.origin}${props.item.videoUrl}`,
);
const shareText = computed(() => {
  const cap = props.item.caption?.trim();
  return cap
    ? `${cap} — ${product.value}'s UGC reel, made in one message with Reelity 🎬`
    : `${product.value}'s UGC reel, made in one message with Reelity 🎬`;
});

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {}
}

function download() {
  downloadVideo(shareUrl.value, downloadName.value);
}

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
  <div
    class="rounded-[12px] border-2 border-[#0a0a0a] bg-white p-3 shadow-[4px_4px_0_0_#0a0a0a]"
    :class="{ 'col-span-2': showDetails }"
  >
    <div class="flex gap-3">
      <!-- when open, pin the video column to a collapsed card's width so the card height never grows -->
      <div class="flex min-w-0 flex-col" :class="showDetails ? 'w-[calc(50%_-_22px)] shrink-0' : 'flex-1'">
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
      </div>

      <div v-if="showDetails" class="min-w-0 flex-1 space-y-2">
        <div class="space-y-1 rounded-[7px] border-2 border-[#0a0a0a] bg-[#f5f2e9] p-2.5">
          <div v-for="d in details" :key="d.k" class="flex gap-2 text-[12px]">
            <span class="w-20 shrink-0 font-mono font-bold uppercase text-[#0a0a0a]/45">{{ d.k }}</span>
            <span class="min-w-0 flex-1 break-words text-[#0a0a0a]/85">{{ d.v }}</span>
          </div>
        </div>
        <div class="space-y-1.5">
          <button
            class="press flex w-full items-center justify-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-[#c6f000] px-2 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#0a0a0a]"
            @click="download"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            download
          </button>
          <button
            class="press flex w-full items-center justify-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-white px-2 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#0a0a0a]"
            @click="showShare = true"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            share
          </button>
          <div class="flex items-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-[#f5f2e9] px-2 py-1">
            <span class="truncate font-mono text-[10px] text-[#0a0a0a]/70">{{ shareUrl }}</span>
            <button
              class="press ml-auto shrink-0 rounded-[5px] border-2 border-[#0a0a0a] bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a]"
              @click="copy"
            >
              {{ copied ? "ok!" : "copy" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <ShareModal
      v-if="showShare"
      :url="shareUrl"
      :text="shareText"
      :title="`${product} reel`"
      :download-name="downloadName"
      @close="showShare = false"
    />
  </div>
</template>
