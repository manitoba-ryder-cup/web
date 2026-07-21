<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>
<template>
  <div class="min-h-screen bg-mrc-surface text-mrc-ink">
    <AppHeader />
    <main><slot /></main>
  </div>
</template>
