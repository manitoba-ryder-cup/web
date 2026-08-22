<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useCupStore } from '@/stores/cup'
import { tournamentEyebrow } from '@/lib/tournament'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import Rosters from '@/components/tournament/Rosters.vue'
import PlayerField from '@/components/tournament/PlayerField.vue'

// Named for what people come looking for, not the list it is made of: before the draft that
// list is all there is, so the field stands in until the teams exist.
const cup = useCupStore()
const { data, error, loading, retry } = useAsync(['teams'], async () => {
  // Resolved once by the shell, so the roster request starts now. The record rides in the same
  // batch, which costs no depth and keeps the eyebrow answering to edits.
  await cup.load()
  const id = cup.latestId
  const [tournament, roster, teams] = id
    ? await Promise.all([scorecardApi.getTournament(id), scorecardApi.getTournamentPlayers(id), scorecardApi.getTournamentTeams(id)])
    : [null, [], []]
  return { tournament, roster, teams }
})

// Which cup these teams belong to, and where it is played. The page is otherwise undated,
// and the same address shows a different two dozen names every year.
const eyebrow = computed(() => tournamentEyebrow(data.value?.tournament))
const roster = computed(() => data.value?.roster ?? [])
const teams = computed(() => data.value?.teams ?? [])

// The captains are on teams from the start, so "some assigned" is not the draft being
// done — it counts as drafted only once every entered player has a team.
const drafted = computed(() => roster.value.length > 0 && roster.value.every((p) => !!p.team_id))
const hasCaptains = computed(() => !!(teams.value[0]?.captain && teams.value[1]?.captain))
</script>
<template>
  <PageLayout image="/img/mountain-green.webp">
    <template #hero>
      <template v-if="loading">
        <SkeletonBlock tone="inverse" class="mx-auto mb-3 h-3 w-40" />
        <SkeletonBlock tone="inverse" radius="md" class="mx-auto h-8 w-72" />
      </template>
      <template v-else>
        <CapsLabel v-if="eyebrow" size="sm" class="mb-3 text-white/80">{{ eyebrow }}</CapsLabel>
        <CaptainMatchup v-if="hasCaptains" :teams="teams" white />
        <h1 v-else class="text-white">Teams</h1>
      </template>
    </template>
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- Hand-built rather than SkeletonList: this page is two columns of faced rows
             under a header apiece, and the shared list reserves one bordered column. -->
        <div class="mx-auto grid max-w-2xl grid-cols-2 gap-x-4" data-testid="skeleton">
          <div v-for="c in 2" :key="c">
            <SkeletonBlock radius="md" class="mb-2 h-9 w-full" />
            <div class="divide-y divide-mrc-line">
              <div v-for="r in 8" :key="r" class="flex items-center gap-2 py-1.5">
                <SkeletonBlock radius="full" class="h-9 w-9 shrink-0" />
                <div class="min-w-0 flex-1">
                  <SkeletonBlock class="h-4 w-2/3" />
                  <SkeletonBlock class="mt-1 h-3 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <p v-if="!roster.length" class="text-center text-mrc-muted">This year's teams haven't been picked yet.</p>
      <Rosters v-else-if="drafted" :players="roster" :teams="teams" />
      <PlayerField v-else :players="roster" />
    </AsyncState>
  </PageLayout>
</template>
