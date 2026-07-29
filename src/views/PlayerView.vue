<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
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
const cupsWon = computed(() => history.value.filter((h) => h.result === 'won').length)

const openId = ref('')

// The open cup lives in the hash, so a cup is linkable — the roster sends you straight to
// this player's current one, and a shared link opens where the sender left it.
//
// Keyed by tournament id, not year. There has been exactly one cup a year since 2008, but
// nothing enforces it: tournaments are unique on (name, start_date, end_date), so a second
// cup in a year is legal. Keyed by year, that would silently resolve to whichever came
// first and leave the other unreachable. The player id in the path is already a uuid, so a
// readable hash was buying very little.
const route = useRoute()
const router = useRouter()

watch(
  [history, () => route.hash],
  async () => {
    const id = route.hash.replace('#', '')
    const entry = id ? history.value.find((h) => h.tournament_id === id) : null
    if (!entry || openId.value === entry.tournament_id) return
    openId.value = entry.tournament_id
    // Arriving on a deep link, the cup can be far down an eighteen-row list.
    await nextTick()
    document.getElementById(`cup-${entry.tournament_id}`)?.scrollIntoView({ block: 'start' })
  },
  { immediate: true },
)

function toggle(entry: { tournament_id: string }) {
  const nowOpen = openId.value !== entry.tournament_id
  openId.value = nowOpen ? entry.tournament_id : ''
  // replace, not push: opening cups shouldn't fill the back button with steps through one
  // player's career.
  router.replace({ hash: nowOpen ? `#${entry.tournament_id}` : '' })
}

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
              <div class="text-[10px] uppercase tracking-widest text-white/60">Record</div>
            </div>
            <div class="px-5 py-2 text-center">
              <div class="text-lg font-semibold tabular-nums">{{ player.cups_won }}</div>
              <div class="text-[10px] uppercase tracking-widest text-white/60">{{ player.cups_won === 1 ? 'Cup Won' : 'Cups Won' }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template v-if="player">
        <section v-if="history.length" class="mt-2">
          <SectionHeader>
            Tournament History
            <template #subheader>{{ cupsPlayed }} played · {{ cupsWon }} won</template>
          </SectionHeader>
          <!-- One row open at a time: an expanded cup runs to a screenful, so letting
               several stack would bury the list it is supposed to make browsable. -->
          <div class="mt-2">
            <PlayerTournamentRow
              v-for="h in history"
              :key="h.tournament_id"
              :entry="h"
              :player-id="id"
              :open="openId === h.tournament_id"
              @toggle="toggle(h)"
            />
          </div>
        </section>
        <p v-else class="mt-6 text-center text-mrc-muted">{{ fullName }} hasn't played in a cup yet.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
