<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import Rosters from '@/components/tournament/Rosters.vue'
import PlayerField from '@/components/tournament/PlayerField.vue'

// This year's two sides. Named for what people come looking for — the matchup, the
// captains, who is in which flight — rather than for the list it is made of; before the
// draft that list is all there is, so the field stands in until the teams exist. Everyone
// who has ever played is on the history page, which is where an archive belongs.
const { data, error, loading, retry } = useAsync(async () => {
  const tournaments = await scorecardApi.listTournaments()
  const current = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
  const [roster, teams] = current
    ? await Promise.all([scorecardApi.getTournamentPlayers(current.id), scorecardApi.getTournamentTeams(current.id)])
    : [[], []]
  return { roster, teams }
})

const roster = computed(() => data.value?.roster ?? [])
const teams = computed(() => data.value?.teams ?? [])

// The captains are on teams from the start, so "some assigned" is not the draft being
// done — it counts as drafted only once every entered player has a team.
const drafted = computed(() => roster.value.length > 0 && roster.value.every((p) => !!p.team_id))
</script>
<template>
  <PageLayout title="Teams" image="/img/mountain-green.webp">
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
