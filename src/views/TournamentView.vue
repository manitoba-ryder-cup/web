<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { tournamentEyebrow } from '@/lib/tournament'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'

const props = defineProps<{ id: string }>()
// Poll so the standings + results stay live during a round without a manual refresh.
const { data, error, loading, retry } = useAsync(
  async () => {
    const [tournament, teams, results] = await Promise.all([
      scorecardApi.getTournament(props.id),
      scorecardApi.getTournamentTeams(props.id),
      scorecardApi.getTournamentResults(props.id),
    ])
    return { tournament, teams, results }
  },
  { intervalMs: 20000 },
)

const tournament = computed(() => data.value?.tournament ?? null)
const teams = computed(() => data.value?.teams ?? [])
const results = computed(() => data.value?.results ?? [])

const heroEyebrow = computed(() => tournamentEyebrow(tournament.value))
// Both captains needed for the matchup; otherwise the eyebrow stands alone.
const hasCaptains = computed(() => !!(teams.value[0]?.captain && teams.value[1]?.captain))
</script>
<template>
  <PageLayout image="/img/crowd.webp">
    <template #hero>
      <p v-if="heroEyebrow" class="mb-3 text-sm font-semibold uppercase tracking-widest text-white/80">{{ heroEyebrow }}</p>
      <CaptainMatchup v-if="hasCaptains" :teams="teams" white />
    </template>
    <!-- Standings bar pinned above the hero. -->
    <template #top>
      <ScoreBar v-if="teams.length >= 2" :results="results" :teams="teams" />
    </template>
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template v-if="tournament">
        <FullBleed flush-top v-if="results.length">
          <MatchResultsSection :matches="results" :teams="teams" :tournament-id="id" />
        </FullBleed>
        <p v-else class="pt-6 text-center text-mrc-muted">There are currently no matches scheduled.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
