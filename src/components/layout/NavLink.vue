<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{ to: string }>()
</script>
<template>
  <RouterLink :to="to" custom v-slot="{ href, navigate, isActive }">
    <a
      :href="href"
      @click="navigate"
      :class="['px-1 py-1 hover:text-white', isActive ? 'text-mrc-accent underline underline-offset-4' : 'text-white/80']"
    >
      <slot />
    </a>
  </RouterLink>
</template>
