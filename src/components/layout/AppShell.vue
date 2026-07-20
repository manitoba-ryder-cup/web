<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>
<template>
  <div class="min-h-screen bg-mrc-surface text-sm text-mrc-ink md:text-base">
    <AppHeader />
    <main><slot /></main>
  </div>
</template>
