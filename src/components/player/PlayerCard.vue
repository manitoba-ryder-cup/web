<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BaseCard from '@/components/base/BaseCard.vue'
import PlayerAvatar from './PlayerAvatar.vue'
defineProps<{ id: string; firstName: string; lastName: string; photoPath: string }>()
</script>
<template>
  <RouterLink :to="{ name: 'player', params: { id } }" class="block transition hover:shadow-lg">
    <BaseCard>
      <div class="flex items-center gap-4">
        <PlayerAvatar :photo-path="photoPath" :alt="`${firstName} ${lastName}`"
                      class="h-16 w-16 shrink-0 rounded-full border border-mrc-line object-cover object-top" />
        <h3 class="font-display text-xl font-semibold">{{ firstName }} {{ lastName }}</h3>
      </div>
    </BaseCard>
  </RouterLink>
</template>
