<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { GalleryItem } from "../lib/types";
import { fetchGallery } from "../lib/gallery";
import { navigate } from "../lib/router";
import GalleryCard from "./GalleryCard.vue";

const PAGE = 24;
const items = ref<GalleryItem[]>([]);
const loading = ref(false);
const done = ref(false);
const loaded = ref(false);

async function loadMore() {
  if (loading.value || done.value) return;
  loading.value = true;
  const batch = await fetchGallery(items.value.length, PAGE);
  items.value.push(...batch);
  if (batch.length < PAGE) done.value = true;
  loading.value = false;
  loaded.value = true;
}

onMounted(() => {
  document.title = "Gallery · Reelity";
  loadMore();
});
</script>

<template>
  <div class="min-h-dvh text-[#0a0a0a]">
    <header class="sticky top-0 z-10 border-b-2 border-[#0a0a0a] bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <button
          type="button"
          class="flex items-center gap-2.5 transition-opacity hover:opacity-70"
          aria-label="Back to Reelity"
          title="Home"
          @click="navigate('/')"
        >
          <span
            class="grid h-7 w-7 place-items-center rounded-[7px] border-2 border-[#0a0a0a] bg-[#c6f000] shadow-[2px_2px_0_0_#0a0a0a]"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5"><path d="M8 5 L8 19 L19 12 Z" fill="#0a0a0a" /></svg>
          </span>
          <span class="font-display text-xl font-bold tracking-tight">REELITY</span>
          <span class="hidden font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a0a0a]/50 sm:inline">/ gallery</span>
        </button>
        <button
          class="press flex items-center gap-1.5 rounded-[8px] border-2 border-[#0a0a0a] bg-[#c6f000] px-3 py-1.5 font-mono text-[11px] font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a] sm:px-4 sm:text-xs"
          @click="navigate('/')"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="#0a0a0a" stroke-width="3">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          make a reel
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-5 py-6">
      <div v-if="items.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <GalleryCard v-for="it in items" :key="it.id" :item="it" />
      </div>

      <p v-else-if="loaded" class="mx-auto max-w-md pt-24 text-center font-mono text-sm text-[#0a0a0a]/60">
        No reels yet — be the first to make one.
      </p>

      <div v-if="!done && items.length" class="mt-8 flex justify-center">
        <button
          class="press rounded-[8px] border-2 border-[#0a0a0a] bg-white px-5 py-2 font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_#0a0a0a] disabled:opacity-50"
          :disabled="loading"
          @click="loadMore"
        >
          {{ loading ? "loading…" : "load more" }}
        </button>
      </div>
    </main>
  </div>
</template>
