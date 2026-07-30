<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'

// Each card shows the final scores, so fetch every tournament's teams (one-time — this
// list isn't polled), newest first.
const { data, error, loading, retry } = useAsync(async () => {
  const tournaments = await scorecardApi.listTournaments()
  const sorted = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))
  return Promise.all(sorted.map(async (t) => ({ tournament: t, teams: await scorecardApi.getTournamentTeams(t.id) })))
})

// The run of the thing, which is the one fact only this page can state. Both halves are
// load-bearing: the span and the count disagree by exactly the years no cup was played,
// so "2008 – 2026 · 18 cups" says a year was missed without spending a sentence on it.
const run = computed(() => {
  const cups = data.value ?? []
  if (!cups.length) return ''
  const year = (i: number) => cups[i].tournament.start_date.slice(0, 4)
  return `${year(cups.length - 1)} – ${year(0)} · ${cups.length} cups` // sorted newest first
})
</script>
<template>
  <PageLayout title="History" image="/img/oceanside.webp">
    <div class="mx-auto mb-8 max-w-2xl text-center">
      <CapsLabel v-if="run" class="mb-2 tabular-nums text-mrc-muted">{{ run }}</CapsLabel>
      <h2 class="mb-4">An Event Like No Other</h2>
      <p class="text-mrc-muted">
        The Manitoba Ryder Cup has become one of the province's greatest sporting events. Every year, a handful of
        <span class="line-through">the best</span> players from across the province go head to head in match play competition. Drama,
        tension, incredible golf, camaraderie, sportsmanship, and alcohol are served in equal measure, captivating an audience of dozens
        around the world. It's an event that transcends sport, yet remains true to the spirit of its founder, Samuel Ryder.
      </p>
    </div>
    <AsyncState :loading="loading" :error="error" :retry="retry" :empty="!data?.length" empty-text="No tournaments yet.">
      <!-- Nine, not eighteen: the page lists roughly eighteen cups, and nine fills the fold
           on a desktop grid without reserving a screenful of placeholder on a phone. -->
      <template #loading><SkeletonGrid :cards="9" /></template>
      <CardGrid>
        <TournamentCard v-for="x in data ?? []" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
      </CardGrid>
    </AsyncState>
  </PageLayout>
</template>
