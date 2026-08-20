<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import BaseSegmented from '@/components/base/BaseSegmented.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'
import Rosters from '@/components/tournament/Rosters.vue'
import PlayerField from '@/components/tournament/PlayerField.vue'

// One list of players under two scopes: this cup's roster, and everyone who has ever taken
// part. The first answers "who is playing this year", so once the draft is done it answers
// it by team — side by side, because the question people actually ask is how the two compare.
const { data, error, loading, retry } = useAsync(async () => {
  const [tournaments, all] = await Promise.all([scorecardApi.listTournaments(), scorecardApi.listPlayers()])
  const current = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
  const [roster, teams] = current
    ? await Promise.all([scorecardApi.getTournamentPlayers(current.id), scorecardApi.getTournamentTeams(current.id)])
    : [[], []]
  return { roster, teams, all }
})

// Roster reads by flight: tier first (gold at the top), then surname within a flight.
const TIER_RANK: Record<string, number> = { gold: 0, silver: 1, black: 2, blue: 3, white: 4 }
const byName = (a: { last_name: string; first_name: string }, b: { last_name: string; first_name: string }) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)

const roster = computed(() =>
  [...(data.value?.roster ?? [])].sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || byName(a, b)),
)
const allPlayers = computed(() => [...(data.value?.all ?? [])].sort(byName))
const teams = computed(() => data.value?.teams ?? [])

// The captains are on teams from the start, so "some assigned" is not the draft being
// done — it counts as drafted only once every entered player has a team.
const drafted = computed(() => roster.value.length > 0 && roster.value.every((p) => !!p.team_id))
</script>
<template>
  <PageLayout title="Players" image="/img/mountain-green.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- The filter pill's own footprint and the same pt-6 panel gap it leaves, so the
             grid doesn't jump when the real one takes over. -->
        <div class="flex justify-center" data-testid="skeleton"><SkeletonBlock radius="full" class="h-[52px] w-56" /></div>
        <div class="pt-6"><SkeletonGrid :cards="9" /></div>
      </template>
      <BaseSegmented :options="['This cup', 'All time']" label="Which players" v-slot="{ index }">
        <template v-if="index === 0">
          <p v-if="!roster.length" class="text-center text-mrc-muted">This year's roster hasn't been set yet.</p>
          <Rosters v-else-if="drafted" :players="roster" :teams="teams" />
          <PlayerField v-else :players="roster" />
        </template>
        <template v-else>
          <p v-if="!allPlayers.length" class="text-center text-mrc-muted">No players yet.</p>
          <CardGrid v-else>
            <PlayerCard
              v-for="p in allPlayers"
              :key="p.id"
              :id="p.id"
              :first-name="p.first_name"
              :last-name="p.last_name"
              :photo-path="p.photo_path"
              :record="p.record"
              :cups="p.cups_won"
            />
          </CardGrid>
        </template>
      </BaseSegmented>
    </AsyncState>
  </PageLayout>
</template>
