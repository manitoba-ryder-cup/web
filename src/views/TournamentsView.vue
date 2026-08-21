<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
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

// The run of the thing, which is the one fact only this page can state. Both halves are
// load-bearing: the span and the count disagree by exactly the years no cup was played,
// so "2008 – 2026 · 18 cups" says a year was missed without spending a sentence on it.
const run = computed(() => {
  if (!cups.value.length) return ''
  const year = (i: number) => cups.value[i].tournament.start_date.slice(0, 4)
  return `${year(cups.value.length - 1)} – ${year(0)} · ${cups.value.length} cups` // sorted newest first
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
                <div class="mx-auto mb-8 max-w-2xl text-center">
                  <CapsLabel v-if="run" class="mb-2 tabular-nums text-mrc-muted">{{ run }}</CapsLabel>
                  <h2 class="mb-4">An Event Like No Other</h2>
                  <p class="text-mrc-muted">
                    The Manitoba Ryder Cup has become one of the province's greatest sporting events. Every year, a handful of
                    <span class="line-through">the best</span> players from across the province go head to head in match play competition.
                    Drama, tension, incredible golf, camaraderie, sportsmanship, and alcohol are served in equal measure, captivating an
                    audience of dozens around the world. It's an event that transcends sport, yet remains true to the spirit of its founder,
                    Samuel Ryder.
                  </p>
                </div>
                <p v-if="!cups.length" class="text-center text-mrc-muted">No tournaments yet.</p>
                <CardGrid v-else>
                  <TournamentCard v-for="x in cups" :key="x.tournament.id" :tournament="x.tournament" :teams="x.teams" />
                </CardGrid>
              </template>
              <template v-else>
                <div class="mx-auto mb-8 max-w-2xl text-center">
                  <CapsLabel v-if="players.length" class="mb-2 tabular-nums text-mrc-muted">
                    {{ players.length }} {{ players.length === 1 ? 'player' : 'players' }}
                  </CapsLabel>
                  <h2 class="mb-4">The Usual Suspects</h2>
                  <p class="text-mrc-muted">
                    Everyone who has ever teed it up in a Manitoba Ryder Cup, and the record they have to show for it. Careers here are
                    built one weekend a year, so a bad round can take a decade to live down. Some of these names turn up year after year;
                    others played once and are still spoken of, for one reason or another.
                  </p>
                </div>
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
