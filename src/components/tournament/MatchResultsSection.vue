<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult } from '@/api/types'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import MatchResultRow from './MatchResultRow.vue'
const props = defineProps<{ matches: MatchResult[] }>()
// Preserve first-seen format order (results come back ordered by tee time).
const groups = computed(() => {
  const order: string[] = []
  const byFormat: Record<string, MatchResult[]> = {}
  for (const m of props.matches) {
    if (!byFormat[m.format_name]) { byFormat[m.format_name] = []; order.push(m.format_name) }
    byFormat[m.format_name].push(m)
  }
  return order.map((name) => ({ name, matches: byFormat[name] }))
})
</script>
<template>
  <div class="space-y-6">
    <div v-for="g in groups" :key="g.name">
      <SectionHeader>{{ g.name }}</SectionHeader>
      <div class="mt-2 divide-y divide-mrc-line">
        <MatchResultRow v-for="m in g.matches" :key="m.match_id" :match="m" />
      </div>
    </div>
  </div>
</template>
