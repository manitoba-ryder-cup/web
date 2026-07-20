<script setup lang="ts">
import { useRouter } from 'vue-router'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import BaseButton from '@/components/base/BaseButton.vue'
const router = useRouter()
</script>
<template>
  <div class="flex h-[28rem] items-center justify-center bg-cover bg-center text-center"
       :style="{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url('/img/crowd.webp')` }">
    <div class="px-4">
      <p class="font-display text-2xl font-light tracking-widest text-white md:text-3xl">Welcome to the</p>
      <h1 class="font-display text-5xl font-bold leading-tight text-white md:text-7xl">Manitoba Ryder Cup</h1>
      <BaseButton variant="transparent" class="mt-6 py-3 text-lg" @click="router.push('/tournaments')">
        View Tournaments
      </BaseButton>
    </div>
  </div>
  <ContentContainer>
    <div class="py-10 text-center">
      <h2 class="font-display text-xl font-bold uppercase tracking-wide">The Cup</h2>
      <p class="mx-auto mt-3 max-w-2xl text-mrc-muted">
        A Ryder-Cup-style team golf competition — Team Blue vs Team Red across multiple match
        formats. Follow the standings and results as they happen.
      </p>
    </div>
  </ContentContainer>
</template>
