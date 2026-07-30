<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'

// Two tabs, like the old app: the current tournament's drafted roster (with tiers) and
// every player who's ever taken part. The roster's tier is per-tournament, so it only
// appears on the first tab.
const { data, error, loading, retry } = useAsync(async () => {
  const [tournaments, all] = await Promise.all([scorecardApi.listTournaments(), scorecardApi.listPlayers()])
  const current = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
  const roster = current ? await scorecardApi.getTournamentPlayers(current.id) : []
  return { roster, all, currentId: current?.id ?? '' }
})

// Roster cards open the player with this cup already expanded — the tab is about this cup,
// and so is the tier each card shows.
const currentId = computed(() => data.value?.currentId ?? '')

// Roster reads by flight: tier first (gold at the top), then surname within a flight.
const TIER_RANK: Record<string, number> = { gold: 0, silver: 1, black: 2, blue: 3, white: 4 }
const byName = (a: { last_name: string; first_name: string }, b: { last_name: string; first_name: string }) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)

const roster = computed(() =>
  [...(data.value?.roster ?? [])].sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || byName(a, b)),
)
const allPlayers = computed(() => [...(data.value?.all ?? [])].sort(byName))
</script>
<template>
  <PageLayout title="Players" image="/img/mountain-green.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- Same full-bleed wrapper and the same pt-6 panel gap BaseTabs uses, so the grid
             doesn't jump up when the real tab bar takes over. -->
        <FullBleed flush-top>
          <SkeletonTabs />
          <div class="px-4 pt-6"><SkeletonGrid :cards="9" /></div>
        </FullBleed>
      </template>
      <!-- Full-bleed so the tab bar spans the content column edge to edge (like the
           tournament page); flush-top drops the gap above it, and the card grid is
           re-padded back inside. -->
      <FullBleed flush-top>
        <BaseTabs :tabs="['Current Roster', 'All Players']">
          <template #default="{ index }">
            <div class="px-4">
              <template v-if="index === 0">
                <p v-if="!roster.length" class="text-center text-mrc-muted">This year's roster hasn't been set yet.</p>
                <CardGrid v-else>
                  <PlayerCard
                    v-for="p in roster"
                    :key="p.player_id"
                    :id="p.player_id"
                    :first-name="p.first_name"
                    :last-name="p.last_name"
                    :photo-path="p.photo_path"
                    :record="p.record"
                    :cups="p.cups_won"
                    :tier="p.tier"
                    :tournament-id="currentId"
                  />
                </CardGrid>
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
            </div>
          </template>
        </BaseTabs>
      </FullBleed>
    </AsyncState>
  </PageLayout>
</template>
