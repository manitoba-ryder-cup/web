<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentPlayer } from '@/api/types'
import PlayerRow from './PlayerRow.vue'

// The full field of entered players, shown before the draft (when there are no teams yet).
// Sorted by tier then surname so flights cluster, split into two columns to stay compact.
const props = defineProps<{ players: TournamentPlayer[] }>()

const columns = computed(() => {
  const sorted = [...props.players].sort(
    (a, b) => a.tier.localeCompare(b.tier) || a.last_name.localeCompare(b.last_name),
  )
  const half = Math.ceil(sorted.length / 2)
  return [sorted.slice(0, half), sorted.slice(half)]
})
</script>
<template>
  <div class="grid grid-cols-2 gap-x-4">
    <ul v-for="(col, i) in columns" :key="i" class="divide-y divide-mrc-line">
      <li v-for="p in col" :key="p.player_id">
        <PlayerRow :player="p" />
      </li>
    </ul>
  </div>
</template>
