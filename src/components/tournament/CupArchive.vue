<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { q } from '@/api/queries'
import { combine, useAsync, useResource } from '@/composables/useAsync'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'

// Fetched here rather than in the page so it starts when this half is first shown, and an
// outage on it leaves the other half readable.
const listRes = useResource(() => q.tournaments())
const sorted = computed(() => [...(listRes.data.value ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date)))

// A join across every cup rather than one resource, so it keeps a key of its own — keyed by
// the cups it joined, or adding one would leave the archive showing the set before it.
const teamsRes = useAsync(
  () => ['cup-archive', sorted.value.map((t) => t.id).join(',')],
  () => Promise.all(sorted.value.map((t) => scorecardApi.getTournamentTeams(t.id))),
  { enabled: () => sorted.value.length > 0 },
)
const { error, loading, retry } = combine([listRes, teamsRes])

const cups = computed(() => sorted.value.map((t, i) => ({ tournament: t, teams: teamsRes.data.value?.[i] ?? [] })))
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
