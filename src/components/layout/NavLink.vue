<script setup lang="ts">
import { RouterLink } from 'vue-router'

// `active` is the caller's to decide, not RouterLink's: isActive is a path prefix test,
// which leaves a player profile — reached from Teams or from History — under neither.
defineProps<{ to: string; active: boolean }>()
</script>
<template>
  <RouterLink :to="to" custom v-slot="{ href, navigate }">
    <a
      :href="href"
      @click="navigate"
      :aria-current="active ? 'page' : undefined"
      :class="['px-1 py-1 hover:text-white', active ? 'text-mrc-accent underline underline-offset-4' : 'text-white/80']"
    >
      <slot />
    </a>
  </RouterLink>
</template>
