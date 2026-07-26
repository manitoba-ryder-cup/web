<script setup lang="ts">
import { RouterLink } from 'vue-router'
withDefaults(defineProps<{ to: string; variant?: 'inline' | 'drawer' }>(), { variant: 'inline' })
</script>
<template>
  <RouterLink :to="to" custom v-slot="{ href, navigate, isActive }">
    <a
      :href="href"
      @click="navigate"
      :class="
        variant === 'inline'
          ? ['px-1 py-1 hover:text-white', isActive ? 'text-mrc-accent underline underline-offset-4' : 'text-white/80']
          : ['flex items-center px-4 py-2 hover:bg-mrc-accent/10', isActive ? 'bg-mrc-accent/25' : '']
      "
    >
      <slot />
    </a>
  </RouterLink>
</template>
