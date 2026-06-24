<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Chat from "./components/Chat.vue";
import Gallery from "./components/Gallery.vue";

const path = ref(location.pathname);
const sync = () => (path.value = location.pathname);

onMounted(() => window.addEventListener("popstate", sync));
onUnmounted(() => window.removeEventListener("popstate", sync));

const isGallery = computed(() => path.value.startsWith("/gallery"));
</script>

<template>
  <Gallery v-if="isGallery" />
  <Chat v-else />
</template>
