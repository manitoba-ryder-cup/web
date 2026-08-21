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
</script>
<template>
  <!-- The hero says what the tab bar already says, so it carries the line the page used to
       spend a paragraph on and earns the height that way. -->
  <PageLayout title="History" image="/img/oceanside.webp" below="An Event Like No Other">
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
                <p v-if="!cups.length" class="text-center text-mrc-muted">No tournaments yet.</p>
                <CardGrid v-else>
                  <TournamentCard v-for="x in cups" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
                </CardGrid>
              </template>
              <template v-else>
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
