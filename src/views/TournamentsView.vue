<script setup lang="ts">
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'

// Each card shows the final scores, so fetch every tournament's teams (one-time — this
// list isn't polled), newest first.
const { data, error, loading } = useAsync(async () => {
  const tournaments = await scorecardApi.listTournaments()
  const sorted = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))
  return Promise.all(sorted.map(async (t) => ({ tournament: t, teams: await scorecardApi.getTournamentTeams(t.id) })))
})
</script>
<template>
  <PageLayout title="History" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :empty="!(data?.length)" empty-text="No tournaments yet.">
      <CardGrid>
        <TournamentCard v-for="x in data ?? []" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
      </CardGrid>
    </AsyncState>
  </PageLayout>
</template>
