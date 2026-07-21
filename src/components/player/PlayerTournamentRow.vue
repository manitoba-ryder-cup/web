<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { PlayerTournamentHistory } from '@/api/types'
const props = defineProps<{ entry: PlayerTournamentHistory }>()
const year = props.entry.start_date.slice(0, 4)
const teamClass = props.entry.team_color === 'Red' ? 'text-mrc-red-team' : 'text-mrc-blue-team'
const resultText = { won: 'Won', lost: 'Lost', tied: 'Tied', in_progress: 'In progress' }[props.entry.result]
const resultClass =
  props.entry.result === 'won'
    ? 'bg-mrc-success-tint text-mrc-success-ink'
    : props.entry.result === 'lost'
      ? 'bg-mrc-red-line text-mrc-red-strong'
      : 'bg-mrc-panel text-mrc-muted'
</script>
<template>
  <RouterLink :to="{ name: 'tournament', params: { id: entry.tournament_id } }"
              class="-mx-4 flex items-center justify-between border-b border-mrc-line px-4 py-3 transition hover:bg-mrc-panel">
    <div class="min-w-0">
      <p class="font-semibold">{{ year }} · <span :class="teamClass">{{ entry.team_color }}</span></p>
      <p class="truncate text-sm text-mrc-muted">{{ entry.location }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-3 pl-3">
      <span class="text-sm text-mrc-muted">{{ entry.record.wins }}–{{ entry.record.losses }}–{{ entry.record.ties }}</span>
      <span class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide" :class="resultClass">{{ resultText }}</span>
      <span class="text-mrc-faint" aria-hidden="true">›</span>
    </div>
  </RouterLink>
</template>
