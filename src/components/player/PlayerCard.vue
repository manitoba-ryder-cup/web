<script setup lang="ts">
import LinkCard from '@/components/base/LinkCard.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { PlayerRecord } from '@/api/types'
defineProps<{ id: string; firstName: string; lastName: string; photoPath: string; record: PlayerRecord }>()
</script>
<template>
  <LinkCard :to="{ name: 'player', params: { id } }">
    <div class="flex items-center gap-4">
      <PlayerAvatar :photo-path="photoPath" :alt="`${firstName} ${lastName}`" />
      <div>
        <h3 class="font-display text-xl font-semibold">{{ firstName }} {{ lastName }}</h3>
        <p class="text-sm text-mrc-muted">{{ record.wins }}–{{ record.losses }}–{{ record.ties }}</p>
      </div>
    </div>
  </LinkCard>
</template>
