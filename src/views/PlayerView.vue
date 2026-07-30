<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useHashAccordion } from '@/composables/useHashAccordion'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import PlayerTournamentRow from '@/components/player/PlayerTournamentRow.vue'
import PlayerStats from '@/components/player/PlayerStats.vue'

const props = defineProps<{ id: string }>()

// One useAsync over both fetches so the page has a single loading/error state. Career
// profile (record + cups) comes from the player; the per-event history — including each
// year's flight and scouting report — from its own endpoint.
const { data, error, loading, retry } = useAsync(async () => {
  const [player, history, stats] = await Promise.all([
    scorecardApi.getPlayer(props.id),
    scorecardApi.getPlayerTournaments(props.id),
    scorecardApi.getPlayerStats(props.id),
  ])
  return { player, history, stats }
})

const player = computed(() => data.value?.player ?? null)
const history = computed(() => data.value?.history ?? [])
const stats = computed(() => data.value?.stats ?? null)
const fullName = computed(() => (player.value ? `${player.value.first_name} ${player.value.last_name}` : ''))
const cupsPlayed = computed(() => history.value.length)

// Keyed by tournament id, not year. There has been exactly one cup a year since 2008, but
// nothing enforces it: tournaments are unique on (name, start_date, end_date), so a second
// cup in a year is legal, and keyed by year one of them would be unreachable. The player
// id in the path is already a uuid, so a readable hash was buying very little.
const { openId, toggle } = useHashAccordion(() => history.value.map((h) => h.tournament_id))

const heroBg = computed(() => `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url('/img/mountain-green.webp')`)
</script>
<template>
  <PageLayout>
    <!-- The old app opened a player with a header carrying the same line as their card,
         only rounder — the headshot as a circular portrait. This is that, over the dark
         mountain band, with the career line set in the scorecard's letterhead idiom. -->
    <template #top>
      <!-- The hero is the page's identity and it's gated on `player`, so without this the
           profile is a nav bar over white until all three requests land and then the whole
           thing appears at once. Same band, same avatar size, same three cells — the point
           is that the band holds its height rather than opening up under the reader. -->
      <div v-if="loading" data-testid="hero-skeleton" class="relative overflow-hidden bg-mrc-ink text-white">
        <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: heroBg }" />
        <div class="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-8 text-center md:max-w-4xl md:py-12 lg:max-w-5xl">
          <SkeletonBlock tone="inverse" radius="full" class="h-28 w-28 md:h-36 md:w-36" />
          <SkeletonBlock tone="inverse" radius="md" class="mt-4 h-9 w-56 md:h-10" />
          <div class="mt-5 inline-grid grid-cols-[1fr_1.5fr_1fr] gap-px overflow-hidden rounded-sm bg-black/25 ring-1 ring-white/15">
            <SkeletonBlock v-for="n in 3" :key="n" tone="inverse" radius="none" class="h-14 w-24 md:w-28" />
          </div>
        </div>
      </div>
      <div v-else-if="player" class="relative overflow-hidden bg-mrc-ink text-white">
        <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: heroBg }" />
        <div class="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-8 text-center md:max-w-4xl md:py-12 lg:max-w-5xl">
          <PlayerAvatar :photo-path="player.photo_path" :alt="fullName" size="hero" />
          <h1 class="mt-4 text-white">{{ fullName }}</h1>
          <!-- Proportional tracks rather than a width per cell: the outer two are equal to
               each other by definition, and the record gets half again as much room because
               it carries the longest string. A ratio states that relationship; three
               hand-picked widths only happen to produce it. -->
          <div
            class="mt-5 inline-grid grid-cols-[1fr_1.5fr_1fr] divide-x divide-white/15 overflow-hidden rounded-sm bg-black/25 ring-1 ring-white/15"
          >
            <div class="px-4 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">{{ cupsPlayed }}</div>
              <CapsLabel class="text-white/60">{{ cupsPlayed === 1 ? 'Event' : 'Events' }}</CapsLabel>
            </div>
            <div class="px-4 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">
                {{ player.record.wins }}–{{ player.record.losses }}–{{ player.record.ties }}
              </div>
              <CapsLabel class="text-white/60">Record</CapsLabel>
            </div>
            <div class="px-4 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">{{ player.cups_won }}</div>
              <CapsLabel class="text-white/60">{{ player.cups_won === 1 ? 'Cup' : 'Cups' }}</CapsLabel>
            </div>
          </div>
        </div>
      </div>
    </template>

    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <FullBleed flush-top>
          <SkeletonTabs />
          <div class="px-4 pt-6"><SkeletonList :rows="6" /></div>
        </FullBleed>
      </template>
      <template v-if="player">
        <!-- sync-hash: this page already spends its hash on the open cup, which is what
             the roster links to; a linkable tab isn't worth taking that over. -->
        <FullBleed v-if="history.length" flush-top>
          <BaseTabs :tabs="['History', 'Stats']" :sync-hash="false">
            <template #default="{ index }">
              <div class="px-4">
                <!-- One row open at a time: an expanded cup runs to a screenful, so
                     letting several stack would bury the list it makes browsable. -->
                <template v-if="index === 0">
                  <div class="-mt-4"></div>
                  <PlayerTournamentRow
                    v-for="h in history"
                    :key="h.tournament_id"
                    :entry="h"
                    :player-id="id"
                    :open="openId === h.tournament_id"
                    @toggle="toggle(h.tournament_id)"
                  />
                </template>
                <PlayerStats v-else-if="stats" :stats="stats" :player-name="fullName" />
              </div>
            </template>
          </BaseTabs>
        </FullBleed>
        <p v-else class="mt-6 text-center text-mrc-muted">{{ fullName }} hasn't played in a cup yet.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
