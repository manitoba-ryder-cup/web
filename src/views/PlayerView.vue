<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
import PlayerTournamentRow from '@/components/player/PlayerTournamentRow.vue'

const props = defineProps<{ id: string }>()

// One useAsync over both fetches so the page has a single loading/error state. Career
// profile (record + cups) comes from the player; the per-event history — including each
// year's flight and scouting report — from its own endpoint.
const { data, error, loading } = useAsync(async () => {
  const [player, history] = await Promise.all([
    scorecardApi.getPlayer(props.id),
    scorecardApi.getPlayerTournaments(props.id),
  ])
  return { player, history }
})

const player = computed(() => data.value?.player ?? null)
const history = computed(() => data.value?.history ?? [])
const fullName = computed(() => (player.value ? `${player.value.first_name} ${player.value.last_name}` : ''))
const cupsPlayed = computed(() => history.value.length)
const cupsWon = computed(() => history.value.filter((h) => h.result === 'won').length)

const heroBg = computed(
  () => `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url('/img/mountain-green.webp')`,
)
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
              <div class="text-lg font-semibold tabular-nums">{{ player.record.wins }}–{{ player.record.losses }}–{{ player.record.ties }}</div>
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

    <AsyncState :loading="loading" :error="error">
      <template v-if="player">
        <BaseCard v-if="history.length" class="mt-6">
          <SectionHeader>
            Tournament History
            <template #subheader>{{ cupsPlayed }} played · {{ cupsWon }} won</template>
          </SectionHeader>
          <div class="mt-2">
            <PlayerTournamentRow v-for="h in history" :key="h.tournament_id" :entry="h" :player-id="id" />
          </div>
        </BaseCard>
        <p v-else class="mt-6 text-center text-mrc-muted">{{ fullName }} hasn't played in a cup yet.</p>
      </template>
    </AsyncState>
  </PageLayout>
</template>
