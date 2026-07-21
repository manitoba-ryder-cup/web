<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult } from '@/api/types'
import BaseTabs from '@/components/base/BaseTabs.vue'
import MatchResultRow from './MatchResultRow.vue'

const props = defineProps<{ matches: MatchResult[] }>()

// Group by format, preserving first-seen order (results arrive ordered by tee time).
const grouped = computed(() => {
  const order: string[] = []
  const byFormat: Record<string, MatchResult[]> = {}
  for (const m of props.matches) {
    if (!byFormat[m.format_name]) { byFormat[m.format_name] = []; order.push(m.format_name) }
    byFormat[m.format_name].push(m)
  }
  return { order, byFormat }
})
</script>
<template>
  <BaseTabs :tabs="grouped.order" v-slot="{ tab }">
    <div class="divide-y divide-mrc-line">
      <MatchResultRow v-for="m in grouped.byFormat[tab]" :key="m.match_id" :match="m" />
    </div>
  </BaseTabs>
</template>
