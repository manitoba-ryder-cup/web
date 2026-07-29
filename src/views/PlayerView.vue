<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useHashAccordion } from '@/composables/useHashAccordion'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import PlayerTournamentRow from '@/components/player/PlayerTournamentRow.vue'

const props = defineProps<{ id: string }>()

// One useAsync over both fetches so the page has a single loading/error state. Career
// profile (record + cups) comes from the player; the per-event history — including each
// year's flight and scouting report — from its own endpoint.
const { data, error, loading, retry } = useAsync(async () => {
  const [player, history] = await Promise.all([scorecardApi.getPlayer(props.id), scorecardApi.getPlayerTournaments(props.id)])
  return { player, history }
})

const player = computed(() => data.value?.player ?? null)
const history = computed(() => data.value?.history ?? [])
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
      <div v-if="player" class="relative overflow-hidden bg-mrc-ink text-white">
        <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: heroBg }" />
        <div class="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-8 text-center md:max-w-4xl md:py-12 lg:max-w-5xl">
          <PlayerAvatar :photo-path="player.photo_path" :alt="fullName" size="hero" />
          <h1 class="mt-4 text-white">{{ fullName }}</h1>
          <div class="mt-5 inline-flex divide-x divide-white/15 overflow-hidden rounded-sm bg-black/25 ring-1 ring-white/15">
            <div class="px-5 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">
                {{ player.record.wins }}–{{ player.record.losses }}–{{ player.record.ties }}
              </div>
              <CapsLabel class="text-white/60">Record</CapsLabel>
            </div>
            <div class="px-5 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">{{ cupsPlayed }}</div>
              <CapsLabel class="text-white/60">{{ cupsPlayed === 1 ? 'Cup' : 'Cups' }}</CapsLabel>
            </div>
            <div class="px-5 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">{{ player.cups_won }}</div>
              <CapsLabel class="text-white/60">{{ player.cups_won === 1 ? 'Cup Won' : 'Cups Won' }}</CapsLabel>
            </div>
          </div>
        </div>
      </div>
    </template>

    <AsyncState :loading="loading" :error="error" :retry="retry">
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
                  <PlayerTournamentRow
                    v-for="h in history"
                    :key="h.tournament_id"
                    :entry="h"
                    :player-id="id"
                    :open="openId === h.tournament_id"
                    @toggle="toggle(h.tournament_id)"
                  />
                </template>
                <p v-else class="text-center text-mrc-muted">Stats are still to come.</p>
              </div>
            </template>
          </BaseTabs>
        </FullBleed>
        <p v-else class="mt-6 text-center text-mrc-muted">{{ fullName }} hasn't played in a cup yet.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
