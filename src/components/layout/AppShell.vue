<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>
<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <AppHeader />
    <main class="mx-auto max-w-4xl p-6"><slot /></main>
  </div>
</template>
