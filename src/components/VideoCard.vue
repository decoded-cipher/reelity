<script setup lang="ts">
import { ref, computed } from "vue";
import type { Job } from "../lib/types";
import { downloadVideo } from "../lib/share";
import ShareModal from "./ShareModal.vue";

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
const videoUrl = computed(() => props.job.videoUrl);

const handle = computed(
  () => "@" + (spec.value?.productName ?? "product").toLowerCase().replace(/[^a-z0-9]/g, ""),
);
const slug = computed(() => (spec.value?.productName ?? "reelity").toLowerCase().replace(/[^a-z0-9]/g, ""));
const downloadName = computed(() => `${slug.value}-reel.mp4`);
const shareUrl = computed(() => {
  const u = props.job.videoUrl;
  if (u) return u.startsWith("http") ? u : `${location.origin}${u}`;
  return `${location.origin}/v/${props.job.id || "preview"}.mp4`;
});
// real file when we have it, else the R2-served URL (survives reloads / blob loss)
const downloadUrl = computed(() => videoUrl.value ?? shareUrl.value);
const shareText = computed(() => caption.value || `Check out this ${spec.value?.productName ?? "product"} reel`);

const details = computed(() => [
  { k: "model", v: props.job.model ?? "—" },
  { k: "format", v: spec.value?.format ?? "—" },
  { k: "caption", v: caption.value },
  { k: "concept", v: props.job.concept ?? spec.value?.concept ?? "" },
  { k: "reaction", v: spec.value?.reactionQuery ?? "" },
  { k: "bg query", v: spec.value?.pexelsQuery ?? "" },
  { k: "gif query", v: spec.value?.giphyQuery ?? "" },
  { k: "audio", v: audio.value?.title ?? spec.value?.audioVibe ?? "" },
  { k: "site", v: spec.value?.siteUrl ?? "" },
]);

const showDetails = ref(false);
const showShare = ref(false);
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {}
}

function download() {
  downloadVideo(downloadUrl.value, downloadName.value);
}
</script>

<template>
  <div class="w-full max-w-[30rem] rounded-[12px] border-2 border-[#0a0a0a] bg-white p-4 shadow-[5px_5px_0_0_#0a0a0a]">
    <div class="flex gap-4">
      <div class="relative aspect-[9/16] w-40 shrink-0 overflow-hidden rounded-[8px] border-2 border-[#0a0a0a] bg-black">
        <video
          v-if="videoUrl"
          :src="videoUrl"
          class="h-full w-full object-cover"
          controls
          autoplay
          muted
          loop
          playsinline
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
          <div class="absolute right-1.5 top-1.5 font-mono text-[8px] font-bold tracking-widest text-white/80">REELITY</div>
          <div class="anim-float absolute right-2 top-1/3 overflow-hidden rounded-[6px] border-2 border-white bg-black/40">
            <img v-if="gifUrl" :src="gifUrl" alt="" class="h-14 w-14 object-cover" />
            <div v-else class="px-2 py-2 text-center font-mono text-[8px] font-bold tracking-wider text-white/90">GIF</div>
          </div>
          <div class="absolute inset-x-2 top-[14%] text-center">
            <div class="text-balance text-xs font-black lowercase leading-tight text-white [text-shadow:_0_1px_2px_rgb(0_0_0_/_0.9),_0_0_4px_rgb(0_0_0_/_0.9)]">
              {{ caption }}
            </div>
          </div>
          <div class="absolute inset-x-2 bottom-2 text-[10px] font-bold text-white">{{ handle }}</div>
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

        <div class="mt-3 flex flex-wrap gap-1.5">
          <button
            class="press inline-flex items-center gap-1 rounded-[7px] border-2 border-[#0a0a0a] bg-[#c6f000] px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#0a0a0a]"
            @click="download"
          >
            ↓ download
          </button>
          <button
            class="press inline-flex items-center gap-1 rounded-[7px] border-2 border-[#0a0a0a] bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#0a0a0a]"
            @click="showShare = true"
          >
            ↗ share
          </button>
          <button
            class="press inline-flex items-center gap-1 rounded-[7px] border-2 border-[#0a0a0a] bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#0a0a0a]"
            @click="emit('remix')"
          >
            ⟳ regenerate
          </button>
        </div>

        <div class="mt-auto pt-3">
          <div class="flex items-center gap-1.5 rounded-[7px] border-2 border-[#0a0a0a] bg-[#f5f2e9] px-2 py-1.5">
            <span class="truncate font-mono text-[11px] text-[#0a0a0a]/70">{{ shareUrl }}</span>
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

    <button
      class="mt-3 flex w-full items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a0a0a]/60"
      @click="showDetails = !showDetails"
    >
      <span>{{ showDetails ? "▾" : "▸" }} what the ai picked</span>
      <span v-if="job.model" class="rounded-[4px] border border-[#0a0a0a] bg-[#f5f2e9] px-1.5 py-px">{{ job.model }}</span>
    </button>
    <div v-if="showDetails" class="mt-2 space-y-1 rounded-[7px] border-2 border-[#0a0a0a] bg-[#f5f2e9] p-2.5">
      <div v-for="d in details" :key="d.k" class="flex gap-2 text-[12px]">
        <span class="w-20 shrink-0 font-mono font-bold uppercase text-[#0a0a0a]/45">{{ d.k }}</span>
        <span class="min-w-0 flex-1 break-words text-[#0a0a0a]/85">{{ d.v }}</span>
      </div>
      <div class="flex gap-2 pt-0.5 text-[12px]">
        <span class="w-20 shrink-0 font-mono font-bold uppercase text-[#0a0a0a]/45">accent</span>
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-3.5 w-3.5 rounded-[3px] border border-[#0a0a0a]" :style="{ background: accent }" />
          <span class="font-mono text-[#0a0a0a]/85">{{ accent }}</span>
        </span>
      </div>
    </div>

    <ShareModal
      v-if="showShare"
      :url="shareUrl"
      :text="shareText"
      :title="`${spec?.productName ?? 'Reelity'} reel`"
      :download-name="downloadName"
      @close="showShare = false"
    />
  </div>
</template>
