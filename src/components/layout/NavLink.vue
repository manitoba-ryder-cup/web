<script setup lang="ts">
import { RouterLink } from 'vue-router'

// `active` is the caller's to decide, not RouterLink's: isActive is a path prefix test,
// which leaves a player profile — reached from Teams or from History — under neither.
defineProps<{ to: string; active: boolean }>()
</script>
<template>
  <RouterLink :to="to" custom v-slot="{ href, navigate }">
    <!-- accent-soft, the shade the tab bar marks with: the accent itself is a deep purple
         and reads as a disabled item against the header's ink. min-h-11 because md starts
         at tablet width, where this nav replaces the bar and is still thumbed. -->
    <a
      :href="href"
      @click="navigate"
      :aria-current="active ? 'page' : undefined"
      :class="[
        'inline-flex min-h-11 items-center px-1 hover:text-white',
        active ? 'text-mrc-accent-soft underline underline-offset-4' : 'text-white/80',
      ]"
    >
      <slot />
    </a>
  </RouterLink>
</template>
