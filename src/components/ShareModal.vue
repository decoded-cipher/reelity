<script setup lang="ts">
import { ref, computed } from "vue";
import { socialLinks, downloadVideo } from "../lib/share";

const props = defineProps<{ url: string; text: string; title: string; downloadName: string }>();
const emit = defineEmits<{ close: [] }>();

const links = computed(() => socialLinks(props.text, props.url));
const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1400);
  } catch {}
}

async function nativeShare() {
  try {
    const blob = await (await fetch(props.url)).blob();
    const file = new File([blob], props.downloadName, { type: "video/mp4" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: props.text });
      return emit("close");
    }
  } catch {}
  try {
    await navigator.share({ title: props.title, text: props.text, url: props.url });
    emit("close");
  } catch {}
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" @click.self="emit('close')">
      <div class="w-full max-w-sm rounded-[14px] border-[3px] border-[#0a0a0a] bg-white p-5 shadow-[8px_8px_0_0_#0a0a0a]">
        <div class="flex items-center justify-between">
          <h3 class="font-display text-lg font-bold">share this reel</h3>
          <button
            class="press grid h-7 w-7 place-items-center rounded-[7px] border-2 border-[#0a0a0a] bg-white shadow-[2px_2px_0_0_#0a0a0a]"
            @click="emit('close')"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="#0a0a0a" stroke-width="3">
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <p class="mt-3 rounded-[8px] border-2 border-[#0a0a0a] bg-[#f5f2e9] px-3 py-2 text-[13px] leading-snug">
          {{ text }}
        </p>

        <div class="mt-4 grid grid-cols-4 gap-2">
          <a
            v-for="s in links"
            :key="s.name"
            :href="s.href"
            target="_blank"
            rel="noopener"
            class="press flex flex-col items-center gap-1 rounded-[9px] border-2 border-[#0a0a0a] bg-white px-1 py-2 shadow-[2px_2px_0_0_#0a0a0a]"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" :style="{ color: s.color }">
              <path :d="s.d" />
            </svg>
            <span class="font-mono text-[9px] font-bold uppercase leading-none">{{ s.name }}</span>
          </a>
        </div>

        <button
          v-if="canShare"
          class="press mt-4 w-full rounded-[9px] border-2 border-[#0a0a0a] bg-[#c6f000] px-3 py-2.5 text-sm font-bold shadow-[2px_2px_0_0_#0a0a0a]"
          @click="nativeShare"
        >
          ↗ share file / more apps…
        </button>

        <div class="mt-3 flex items-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-[#f5f2e9] px-2 py-1.5">
          <span class="truncate font-mono text-[11px] text-[#0a0a0a]/70">{{ url }}</span>
          <button
            class="press ml-auto shrink-0 rounded-[5px] border-2 border-[#0a0a0a] bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a]"
            @click="copy"
          >
            {{ copied ? "ok!" : "copy" }}
          </button>
        </div>

        <button
          class="press mt-3 w-full rounded-[9px] border-2 border-[#0a0a0a] bg-[#0a0a0a] px-3 py-2.5 text-sm font-bold text-white shadow-[2px_2px_0_0_#0a0a0a]"
          @click="downloadVideo(url, downloadName)"
        >
          ↓ download mp4
        </button>
      </div>
    </div>
  </Teleport>
</template>
