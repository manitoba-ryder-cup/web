<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentTeam } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import TeamStandingPanel from '@/components/tournament/TeamStandingPanel.vue'
import StandingsBar from '@/components/tournament/StandingsBar.vue'
import WinnerBanner from '@/components/tournament/WinnerBanner.vue'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'
import { formatDateRange } from '@/lib/date'

const props = defineProps<{ id: string }>()
const { data, error, loading } = useAsync(() => Promise.all([
  scorecardApi.getTournament(props.id),
  scorecardApi.getTournamentTeams(props.id),
  scorecardApi.getTournamentWinner(props.id),
  scorecardApi.getTournamentResults(props.id),
]))

const tournament = computed(() => data.value?.[0] ?? null)
const teams = computed(() => data.value?.[1] ?? [])
const winner = computed(() => data.value?.[2] ?? null)
const results = computed(() => data.value?.[3] ?? [])

const redTeam = computed(() => teams.value.find((t) => t.color === 'Red') ?? null)
const blueTeam = computed(() => teams.value.find((t) => t.color === 'Blue') ?? null)

const winnerColor = computed<'Red' | 'Blue' | 'Tied' | null>(() => {
  if (!winner.value?.finished) return null
  if (winner.value.winner_team_id === null) return 'Tied'
  const c = teams.value.find((t) => t.id === winner.value?.winner_team_id)?.color
  return c === 'Red' || c === 'Blue' ? c : 'Tied'
})

function captainName(team: TournamentTeam | null): string {
  if (!team?.captain) return 'No captain assigned'
  return `${team.captain.first_name} ${team.captain.last_name}`
}
</script>
<template>
  <PageLayout :title="tournament?.name ?? 'Leaderboard'" image="/img/crowd.webp">
    <AsyncState :loading="loading" :error="error">
      <template v-if="tournament">
        <header class="mb-6 text-center">
          <p class="text-mrc-muted">{{ tournament.location }}</p>
          <p class="text-sm text-mrc-faint">{{ formatDateRange(tournament.start_date, tournament.end_date) }}</p>
        </header>
        <BaseCard class="mb-6">
          <SectionHeader>Standings</SectionHeader>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <TeamStandingPanel color="Blue" :captain="captainName(blueTeam)" :points="blueTeam?.points ?? 0" />
            <TeamStandingPanel color="Red" :captain="captainName(redTeam)" :points="redTeam?.points ?? 0" />
          </div>
          <StandingsBar class="mt-4" :blue-points="blueTeam?.points ?? 0" :red-points="redTeam?.points ?? 0" />
        </BaseCard>
        <BaseCard>
          <WinnerBanner :winner-color="winnerColor" />
        </BaseCard>
        <BaseCard v-if="results.length" class="mt-6">
          <SectionHeader>Results</SectionHeader>
          <MatchResultsSection class="mt-4" :matches="results" />
        </BaseCard>
      </template>
    </AsyncState>
  </PageLayout>
</template>
