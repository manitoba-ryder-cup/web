<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { TournamentPlayer } from '@/api/types'
import { tierDot } from '@/lib/tier'

// One player line, shared by the team sheet and the pre-draft field: name (linking to the
// profile, where the year's bio lives), a tier dot, and career form below.
defineProps<{ player: TournamentPlayer }>()

function record(p: TournamentPlayer): string {
  return `${p.record.wins}-${p.record.losses}-${p.record.ties}`
}
</script>
<template>
  <RouterLink :to="{ name: 'player', params: { id: player.player_id } }" class="group block py-1.5">
    <div class="flex items-center gap-1.5">
      <span class="min-w-0 flex-1 truncate text-sm text-mrc-ink transition group-hover:text-mrc-accent">
        {{ player.first_name }} {{ player.last_name }}
      </span>
      <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="tierDot(player.tier)" :title="`${player.tier} tier`" />
    </div>
    <div class="mt-0.5 text-xs tabular-nums text-mrc-muted">
      {{ record(player) }}<span v-if="player.cups_won > 0"> · {{ player.cups_won }} {{ player.cups_won === 1 ? 'CUP' : 'CUPS' }}</span>
    </div>
  </RouterLink>
</template>
