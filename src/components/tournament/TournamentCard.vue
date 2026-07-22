<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import { formatDateRange } from '@/lib/date'
import LinkCard from '@/components/base/LinkCard.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'

// A tournament summary card: location + dates, then both teams' final scores in their
// colours with a trophy on the winner. Teams are identified by captain, ordered by id.
const props = defineProps<{ tournament: Tournament; teams: TournamentTeam[] }>()

const ordered = computed(() => [...props.teams].sort((a, b) => a.id.localeCompare(b.id)))
const winnerId = computed(() => {
  const [a, b] = ordered.value
  if (!a || !b || a.points === b.points) return null // no teams, or a draw (Cup retained)
  return a.points > b.points ? a.id : b.id
})
</script>
<template>
  <LinkCard :to="{ name: 'tournament', params: { id: tournament.id } }">
    <h3 class="text-center font-display text-2xl font-semibold text-mrc-ink">{{ tournament.location }}</h3>
    <p class="mb-4 text-center text-sm text-mrc-muted">{{ formatDateRange(tournament.start_date, tournament.end_date) }}</p>
    <div class="flex">
      <div v-for="t in ordered" :key="t.id" class="w-1/2">
        <div class="flex items-center justify-center gap-2 font-semibold leading-none" :class="teamColor(t.color).text">
          <TrophyIcon v-if="winnerId === t.id" class="text-mrc-gold" />
          <span class="text-6xl tracking-tighter tabular-nums">{{ Math.trunc(t.points) }}</span>
          <span v-if="t.points % 1 !== 0" class="text-4xl">½</span>
        </div>
        <p class="mt-1 truncate text-center text-mrc-ink">Team {{ t.captain?.last_name }}</p>
      </div>
    </div>
  </LinkCard>
</template>
