<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { PlayerTournamentHistory } from '@/api/types'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'

// One event in a player's history — a clean navigation row into that player's cup (their
// flight, scouting report, and matches live on the drill-in page, not crammed in here).
const props = defineProps<{ entry: PlayerTournamentHistory; playerId: string }>()
const year = props.entry.start_date.slice(0, 4)
// The player's team that event, identified by its captain ("Team Macaulay").
const teamName = props.entry.captain_last_name ? `Team ${props.entry.captain_last_name}` : ''
const resultLabel = { won: 'Won', lost: 'Lost', tied: 'Tied', in_progress: 'In progress' }[props.entry.result]
const resultClass =
  props.entry.result === 'won'
    ? 'bg-mrc-success-tint text-mrc-success-ink'
    : props.entry.result === 'lost'
      ? 'bg-mrc-red-line text-mrc-red-strong'
      : 'bg-mrc-panel text-mrc-muted'
</script>
<template>
  <RouterLink
    :to="{ name: 'player-tournament', params: { id: playerId, tournamentId: entry.tournament_id } }"
    class="group -mx-4 flex items-center justify-between border-b border-mrc-line px-4 py-3 transition hover:bg-mrc-panel"
  >
    <div class="min-w-0">
      <p class="font-semibold">
        {{ year }}<template v-if="teamName"> · {{ teamName }}</template>
      </p>
      <p class="truncate text-sm text-mrc-muted">{{ entry.location }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-3 pl-3">
      <span class="text-sm tabular-nums text-mrc-muted">{{ entry.record.wins }}–{{ entry.record.losses }}–{{ entry.record.ties }}</span>
      <span class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide" :class="resultClass">{{ resultLabel }}</span>
      <ChevronRightIcon class="text-mrc-faint transition group-hover:text-mrc-accent" />
    </div>
  </RouterLink>
</template>
