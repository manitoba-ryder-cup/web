<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import WinnerBanner from '@/components/tournament/WinnerBanner.vue'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'

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

// Hero: "{year} Leaderboard", captains above ("Team X vs. Team Y"), location below.
// A team is identified by its captain's surname, never by its color.
const heroTitle = computed(() => {
  const year = tournament.value?.start_date?.slice(0, 4)
  return year ? `${year} Leaderboard` : 'Leaderboard'
})
const heroAbove = computed(() => {
  const left = blueTeam.value?.captain?.last_name
  const right = redTeam.value?.captain?.last_name
  return left && right ? `Team ${left} vs. Team ${right}` : ''
})
</script>
<template>
  <PageLayout :title="heroTitle" :above="heroAbove" :below="tournament?.location ?? ''" image="/img/crowd.webp">
    <AsyncState :loading="loading" :error="error">
      <template v-if="tournament">
        <!-- Sticky standings bar, flush under the hero (negative margins cancel the
             page body's padding so it spans the full content width). -->
        <ScoreBar class="-mx-4 -mt-8 mb-6"
                  :match-count="results.length"
                  :blue-points="blueTeam?.points ?? 0"
                  :red-points="redTeam?.points ?? 0" />
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
