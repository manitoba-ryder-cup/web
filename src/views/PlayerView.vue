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
// One useAsync over both fetches so the page has a single loading/error state.
const { data, error, loading } = useAsync(() =>
  Promise.all([scorecardApi.getPlayer(props.id), scorecardApi.getPlayerTournaments(props.id)]))
const player = computed(() => data.value?.[0] ?? null)
const history = computed(() => data.value?.[1] ?? [])
const cupsPlayed = computed(() => history.value.length)
const cupsWon = computed(() => history.value.filter((h) => h.result === 'won').length)
</script>
<template>
  <PageLayout>
    <AsyncState :loading="loading" :error="error">
      <template v-if="player">
        <div class="mt-4 flex items-center gap-4">
          <PlayerAvatar :photo-path="player.photo_path" :alt="`${player.first_name} ${player.last_name}`" size="lg" />
          <h2>{{ player.first_name }} {{ player.last_name }}</h2>
        </div>
        <BaseCard class="mt-6">
          <SectionHeader>Match Record</SectionHeader>
          <div class="mt-4 flex gap-8 text-center">
            <div>
              <p class="text-4xl font-semibold text-mrc-blue-team">{{ player.record.wins }}</p>
              <p class="text-xs uppercase tracking-wide text-mrc-muted">Wins</p>
            </div>
            <div>
              <p class="text-4xl font-semibold text-mrc-muted">{{ player.record.ties }}</p>
              <p class="text-xs uppercase tracking-wide text-mrc-muted">Ties</p>
            </div>
            <div>
              <p class="text-4xl font-semibold text-mrc-red-team">{{ player.record.losses }}</p>
              <p class="text-xs uppercase tracking-wide text-mrc-muted">Losses</p>
            </div>
          </div>
        </BaseCard>
        <BaseCard v-if="history.length" class="mt-6">
          <SectionHeader>
            Tournament History
            <template #subheader>{{ cupsPlayed }} played · {{ cupsWon }} won</template>
          </SectionHeader>
          <div class="mt-2">
            <PlayerTournamentRow v-for="h in history" :key="h.tournament_id" :entry="h" />
          </div>
        </BaseCard>
      </template>
    </AsyncState>
  </PageLayout>
</template>
