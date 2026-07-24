<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppToasts from '@/components/base/AppToasts.vue'
</script>
<template>
  <div class="min-h-screen bg-mrc-surface text-mrc-ink">
    <AppHeader />
    <main><slot /></main>
    <AppToasts />
  </div>
</template>
