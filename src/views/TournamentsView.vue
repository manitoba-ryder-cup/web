<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'

// The archive, in its two halves: the cups, and the people who have played in them. A
// fetch each, so an outage on one tab still leaves the other one readable — the cups are
// the tab that opens, and they have no reason to wait on the player list.
//
// Each card shows the final scores, so fetch every tournament's teams (one-time — this
// list isn't polled), newest first.
const {
  data: cups,
  error: cupsError,
  loading: cupsLoading,
  retry: retryCups,
} = useAsync(async () => {
  const tournaments = await scorecardApi.listTournaments()
  const sorted = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))
  return Promise.all(sorted.map(async (t) => ({ tournament: t, teams: await scorecardApi.getTournamentTeams(t.id) })))
})

const {
  data: roll,
  error: playersError,
  loading: playersLoading,
  retry: retryPlayers,
} = useAsync(async () => {
  const list = await scorecardApi.listPlayers()
  return [...list].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
})

const tournaments = computed(() => cups.value ?? [])
const players = computed(() => roll.value ?? [])
</script>
<template>
  <!-- The hero says what the tab bar already says, so it carries the line the page used to
       spend a paragraph on and earns the height that way. -->
  <PageLayout title="History" image="/img/oceanside.webp" below="An Event Like No Other">
    <!-- Full-bleed so the tab bar spans the content column edge to edge; flush-top drops
         the gap above it, and the panel is re-padded back inside. The bar sits outside the
         loading state because its labels are fixed: it is page chrome, not a claim about
         data, and a deep link's tab is right from the first frame. -->
    <FullBleed flush-top>
      <BaseTabs :tabs="['Tournaments', 'Participants']">
        <template #default="{ index }">
          <div class="px-4">
            <AsyncState v-if="index === 0" :loading="cupsLoading" :error="cupsError" :retry="retryCups">
              <template #loading><SkeletonGrid :cards="9" /></template>
              <p v-if="!tournaments.length" class="text-center text-mrc-muted">No tournaments yet.</p>
              <CardGrid v-else>
                <TournamentCard v-for="x in tournaments" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
              </CardGrid>
            </AsyncState>
            <AsyncState v-else :loading="playersLoading" :error="playersError" :retry="retryPlayers">
              <template #loading><SkeletonGrid :cards="9" /></template>
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
            </AsyncState>
          </div>
        </template>
      </BaseTabs>
    </FullBleed>
  </PageLayout>
</template>
