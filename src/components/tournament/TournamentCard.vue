<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import { formatDayRange } from '@/lib/date'
import PointsTotal from '@/components/base/PointsTotal.vue'
import LinkCard from '@/components/base/LinkCard.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'

// Headed by the year because there has been one cup a year since 2008, so the year is which
// cup this is. The venue moves around, so it earns its own line rather than a suffix.
const props = defineProps<{ tournament: Tournament; teams: TournamentTeam[] }>()

const year = computed(() => props.tournament.start_date.slice(0, 4))

const winnerId = computed(() => {
  const [a, b] = props.teams
  if (!a || !b || a.points === b.points) return null // no teams, or a draw (Cup retained)
  return a.points > b.points ? a.id : b.id
})
</script>
<template>
  <LinkCard :to="{ name: 'tournament', params: { id: tournament.id } }">
    <h3 class="text-center font-body tabular-nums mb-1">{{ year }}</h3>
    <p class="text-center text-mrc-ink">{{ tournament.location }}</p>
    <p class="mb-4 text-center text-sm text-mrc-muted">{{ formatDayRange(tournament.start_date, tournament.end_date) }}</p>
    <div class="flex">
      <!-- The trophy sits on each side's inner edge — right of the left team's score, left
           of the right team's — so a win doesn't shunt one half's number off centre. -->
      <div v-for="(t, i) in teams" :key="t.id" class="w-1/2">
        <div
          class="flex items-center justify-center gap-2 font-bold leading-none"
          :class="[teamColor(t.color).text, i === 0 ? 'flex-row-reverse' : '']"
        >
          <TrophyIcon v-if="winnerId === t.id" class="text-mrc-gold" />
          <PointsTotal :points="t.points" />
        </div>
        <p class="mt-1 truncate text-center text-mrc-ink">Team {{ t.captain?.last_name }}</p>
      </div>
    </div>
  </LinkCard>
</template>
