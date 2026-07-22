<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'

const props = defineProps<{ id: string }>()
const { data, error, loading } = useAsync(() => Promise.all([
  scorecardApi.getTournament(props.id),
  scorecardApi.getTournamentTeams(props.id),
  scorecardApi.getTournamentResults(props.id),
]))

const tournament = computed(() => data.value?.[0] ?? null)
const teams = computed(() => data.value?.[1] ?? [])
const results = computed(() => data.value?.[2] ?? [])

// One stable left/right order for the whole page (hero, ScoreBar, cards), by team id —
// independent of colour, so nothing hardcodes "blue is left".
const orderedTeams = computed(() => [...teams.value].sort((a, b) => a.id.localeCompare(b.id)))

// Hero: "{year} Leaderboard", captains above ("Team X vs. Team Y"), location below.
// A team is identified by its captain's surname, never by its colour.
const heroTitle = computed(() => {
  const year = tournament.value?.start_date?.slice(0, 4)
  return year ? `${year} Leaderboard` : 'Leaderboard'
})
const heroAbove = computed(() => {
  const a = orderedTeams.value[0]?.captain?.last_name
  const b = orderedTeams.value[1]?.captain?.last_name
  return a && b ? `Team ${a} vs. Team ${b}` : ''
})
</script>
<template>
  <PageLayout :title="heroTitle" :above="heroAbove" :below="tournament?.location ?? ''" image="/img/crowd.webp">
    <AsyncState :loading="loading" :error="error">
      <template v-if="tournament">
        <!-- Sticky standings bar, flush under the hero and spanning the content column. -->
        <FullBleed flush-top>
          <ScoreBar :match-count="results.length" :teams="orderedTeams" />
        </FullBleed>
        <FullBleed v-if="results.length">
          <MatchResultsSection :matches="results" :teams="orderedTeams" :tournament-id="id" />
        </FullBleed>
        <p v-else class="pt-6 text-center text-mrc-muted">There are currently no matches scheduled.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
