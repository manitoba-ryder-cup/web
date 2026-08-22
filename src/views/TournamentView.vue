<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useCoarseClock } from '@/composables/useCoarseClock'
import { cupInPlay } from '@/lib/scoringWindow'
import { tournamentEyebrow } from '@/lib/tournament'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'

const props = defineProps<{ id: string }>()
// Not zero when the cup is idle: an unpublished schedule reads as not in play, and only a
// request turns that empty list full.
const clock = useCoarseClock()
const inPlay = ref(false)
const { data, error, loading, retry } = useAsync(
  () => ['tournament', props.id],
  async () => {
    const [tournament, teams, results] = await Promise.all([
      scorecardApi.getTournament(props.id),
      scorecardApi.getTournamentTeams(props.id),
      scorecardApi.getTournamentResults(props.id),
    ])
    return { tournament, teams, results }
  },
  { intervalMs: () => (inPlay.value ? 20_000 : 300_000) },
)

const tournament = computed(() => data.value?.tournament ?? null)
const teams = computed(() => data.value?.teams ?? [])
const results = computed(() => data.value?.results ?? [])
watchEffect(() => (inPlay.value = cupInPlay(results.value, clock.value)))

const heroEyebrow = computed(() => tournamentEyebrow(tournament.value))
// Both captains needed for the matchup; otherwise the eyebrow stands alone.
const hasCaptains = computed(() => !!(teams.value[0]?.captain && teams.value[1]?.captain))
</script>
<template>
  <PageLayout image="/img/crowd.webp">
    <template #hero>
      <template v-if="loading">
        <SkeletonBlock tone="inverse" class="mx-auto mb-3 h-3 w-40" />
        <SkeletonBlock tone="inverse" radius="md" class="mx-auto h-8 w-72" />
      </template>
      <template v-else>
        <p v-if="heroEyebrow" class="mb-3 text-sm font-semibold uppercase tracking-widest text-white/80">{{ heroEyebrow }}</p>
        <CaptainMatchup v-if="hasCaptains" :teams="teams" white />
      </template>
    </template>
    <!-- Standings bar pinned above the hero. -->
    <template #top>
      <!-- Reserved, not omitted: the bar is the first thing on the page, so letting it appear late
           pushes everything down after the reader has started. -->
      <div v-if="loading" data-testid="scorebar-skeleton" class="bg-mrc-surface shadow">
        <SkeletonBlock radius="none" class="h-20 w-full" />
      </div>
      <ScoreBar v-else-if="teams.length >= 2" :results="results" :teams="teams" />
    </template>
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <FullBleed flush-top>
          <SkeletonTabs />
          <div class="px-4 pt-6"><SkeletonList :rows="5" /></div>
        </FullBleed>
      </template>
      <template v-if="tournament">
        <FullBleed flush-top v-if="results.length">
          <MatchResultsSection :matches="results" :teams="teams" :tournament-id="id" />
        </FullBleed>
        <p v-else class="pt-6 text-center text-mrc-muted">There are currently no matches scheduled.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
