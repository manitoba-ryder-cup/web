<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'

// The archive, in its two halves: the cups, and the people who have played in them. Each
// card shows the final scores, so fetch every tournament's teams (one-time — this list
// isn't polled), newest first.
const { data, error, loading, retry } = useAsync(async () => {
  const [tournaments, players] = await Promise.all([scorecardApi.listTournaments(), scorecardApi.listPlayers()])
  const sorted = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))
  const cups = await Promise.all(sorted.map(async (t) => ({ tournament: t, teams: await scorecardApi.getTournamentTeams(t.id) })))
  return { cups, players }
})

const cups = computed(() => data.value?.cups ?? [])
const players = computed(() =>
  [...(data.value?.players ?? [])].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)),
)

// Each tab's heading is its own totals line — the one fact only this page can state, and
// with the tabs above it there is nothing left for a standfirst to explain. Both halves of
// the run are load-bearing: the span and the count disagree by exactly the years no cup was
// played, so "2008 – 2026 · 18 cups" says a year was missed without spending a sentence on
// it. The players line is anchored to the same first year so the two read as a pair.
const firstYear = computed(() => cups.value[cups.value.length - 1]?.tournament.start_date.slice(0, 4) ?? '') // sorted newest first
const run = computed(() => {
  if (!cups.value.length) return ''
  return `${firstYear.value} – ${cups.value[0].tournament.start_date.slice(0, 4)} · ${cups.value.length} cups`
})
const played = computed(() => {
  if (!players.value.length) return ''
  return firstYear.value ? `${players.value.length} players since ${firstYear.value}` : `${players.value.length} players`
})
</script>
<template>
  <PageLayout title="History" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- Same full-bleed wrapper and pt-6 panel gap BaseTabs uses, so the grid doesn't
             jump when the real tab bar takes over. -->
        <FullBleed flush-top>
          <SkeletonTabs />
          <div class="px-4 pt-6"><SkeletonGrid :cards="9" /></div>
        </FullBleed>
      </template>
      <!-- Full-bleed so the tab bar spans the content column edge to edge; flush-top drops
           the gap above it, and the panel is re-padded back inside. -->
      <FullBleed flush-top>
        <BaseTabs :tabs="['Tournaments', 'Participants']">
          <template #default="{ index }">
            <div class="px-4">
              <template v-if="index === 0">
                <h2 v-if="run" class="mb-6 text-center tabular-nums">{{ run }}</h2>
                <p v-if="!cups.length" class="text-center text-mrc-muted">No tournaments yet.</p>
                <CardGrid v-else>
                  <TournamentCard v-for="x in cups" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
                </CardGrid>
              </template>
              <template v-else>
                <h2 v-if="played" class="mb-6 text-center tabular-nums">{{ played }}</h2>
                <p v-if="!players.length" class="text-center text-mrc-muted">No players yet.</p>
                <CardGrid v-else>
                  <PlayerCard
                    v-for="p in players"
                    :key="p.id"
                    :id="p.id"
                    :first-name="p.first_name"
                    :last-name="p.last_name"
                    :photo-path="p.photo_path"
                    :record="p.record"
                    :cups="p.cups_won"
                    from="history"
                  />
                </CardGrid>
              </template>
            </div>
          </template>
        </BaseTabs>
      </FullBleed>
    </AsyncState>
  </PageLayout>
</template>
