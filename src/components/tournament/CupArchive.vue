<script setup lang="ts">
import { computed } from 'vue'
import { q } from '@/api/queries'
import { combine, useResource, useResources } from '@/composables/useAsync'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'

// Fetched here rather than in the page so it starts when this half is first shown, and an
// outage on it leaves the other half readable.
const listRes = useResource(() => q.tournaments())
const sorted = computed(() => [...(listRes.data.value ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date)))

// Each cup's teams under that cup's own key, so the current cup costs nothing here and a cup
// opened from this grid is already answered.
const teamsRes = useResources(() => sorted.value.map((t) => q.teams(t.id)))
const { error, loading, retry } = combine([listRes, teamsRes])

const cups = computed(() => sorted.value.map((t, i) => ({ tournament: t, teams: teamsRes.data.value[i] ?? [] })))
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
