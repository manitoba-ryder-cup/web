<script setup lang="ts">
import LinkCard from '@/components/base/LinkCard.vue'
import { formatDateRange } from '@/lib/date'
defineProps<{ id: string; name: string; location: string; startDate: string; endDate: string }>()
</script>
<template>
  <LinkCard :to="{ name: 'tournament', params: { id } }">
    <h3 class="text-center font-semibold">{{ location }}</h3>
    <p class="text-center text-mrc-ink">{{ name }}</p>
    <p class="text-center text-sm text-mrc-muted">{{ formatDateRange(startDate, endDate) }}</p>
  </LinkCard>
</template>
