<script setup lang="ts">
import LinkCard from '@/components/base/LinkCard.vue'
import PlayerAvatar from './PlayerAvatar.vue'
defineProps<{ id: string; firstName: string; lastName: string; photoPath: string }>()
</script>
<template>
  <LinkCard :to="{ name: 'player', params: { id } }">
    <div class="flex items-center gap-4">
      <PlayerAvatar :photo-path="photoPath" :alt="`${firstName} ${lastName}`" />
      <h3 class="font-display text-xl font-semibold">{{ firstName }} {{ lastName }}</h3>
    </div>
  </LinkCard>
</template>
