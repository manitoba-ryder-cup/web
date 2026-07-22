<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'

const props = defineProps<{ id: string }>()
// Poll so the standings + results stay live during a round without a manual refresh.
const { data, error, loading } = useAsync(() => Promise.all([
  scorecardApi.getTournament(props.id),
  scorecardApi.getTournamentTeams(props.id),
  scorecardApi.getTournamentResults(props.id),
]), { intervalMs: 20000 })

const tournament = computed(() => data.value?.[0] ?? null)
const teams = computed(() => data.value?.[1] ?? [])
const results = computed(() => data.value?.[2] ?? [])

// One stable left/right order for the whole page (hero, ScoreBar, cards), by team id —
// independent of colour, so nothing hardcodes "blue is left".
const orderedTeams = computed(() => [...teams.value].sort((a, b) => a.id.localeCompare(b.id)))

// Hero matches the dashboard: the coloured captain-vs-captain matchup, with year · location
// above it. A team is identified by its captain, never by its colour.
const heroEyebrow = computed(() => {
  const t = tournament.value
  if (!t) return ''
  return [t.start_date?.slice(0, 4), t.location].filter(Boolean).join(' · ')
})
// Both captains needed for the matchup; otherwise the eyebrow stands alone.
const hasCaptains = computed(() => !!(orderedTeams.value[0]?.captain && orderedTeams.value[1]?.captain))
</script>
<template>
  <PageLayout image="/img/crowd.webp">
    <template #hero>
      <p v-if="heroEyebrow" class="mb-3 text-sm font-semibold uppercase tracking-widest text-white/80">{{ heroEyebrow }}</p>
      <CaptainMatchup v-if="hasCaptains" :teams="orderedTeams" white />
    </template>
    <!-- Standings bar pinned above the hero. -->
    <template #top>
      <ScoreBar v-if="orderedTeams.length >= 2" :results="results" :teams="orderedTeams" />
    </template>
    <AsyncState :loading="loading" :error="error">
      <template v-if="tournament">
        <FullBleed flush-top v-if="results.length">
          <MatchResultsSection :matches="results" :teams="orderedTeams" :tournament-id="id" />
        </FullBleed>
        <p v-else class="pt-6 text-center text-mrc-muted">There are currently no matches scheduled.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
