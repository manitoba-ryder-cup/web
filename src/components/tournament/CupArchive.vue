<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'

// Fetched here rather than in the page so it starts when this half is first shown, and an
// outage on it leaves the other half readable.
const { data, error, loading, retry } = useAsync(['cups', 'archive'], async () => {
  const tournaments = await scorecardApi.listTournaments()
  const sorted = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))
  return Promise.all(sorted.map(async (t) => ({ tournament: t, teams: await scorecardApi.getTournamentTeams(t.id) })))
})

const cups = computed(() => data.value ?? [])
</script>
<template>
  <AsyncState :loading="loading" :error="error" :retry="retry">
    <template #loading><SkeletonGrid :cards="9" /></template>
    <p v-if="!cups.length" class="text-center text-mrc-muted">No tournaments yet.</p>
    <CardGrid v-else>
      <TournamentCard v-for="x in cups" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
    </CardGrid>
  </AsyncState>
</template>
