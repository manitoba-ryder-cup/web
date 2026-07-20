<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BaseCard from '@/components/base/BaseCard.vue'
import { formatDateRange } from '@/lib/date'
defineProps<{ id: string; name: string; location: string; startDate: string; endDate: string }>()
</script>
<template>
  <RouterLink :to="{ name: 'tournament', params: { id } }" class="block transition hover:shadow-lg">
    <BaseCard>
      <h3 class="text-center font-display text-2xl font-semibold">{{ location }}</h3>
      <p class="text-center text-mrc-ink">{{ name }}</p>
      <p class="text-center text-sm text-mrc-muted">{{ formatDateRange(startDate, endDate) }}</p>
    </BaseCard>
  </RouterLink>
</template>
