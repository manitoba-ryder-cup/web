<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'

const props = defineProps<{ id: string }>()
const { data: player, error, loading } = useAsync(() => scorecardApi.getPlayer(props.id))
</script>
<template>
  <PageLayout>
    <RouterLink :to="{ name: 'players' }" class="text-sm text-mrc-accent hover:underline">← All players</RouterLink>
    <AsyncState :loading="loading" :error="error">
      <template v-if="player">
        <div class="mt-4 flex items-center gap-4">
          <PlayerAvatar :photo-path="player.photo_path" :alt="`${player.first_name} ${player.last_name}`" size="lg" />
          <h1 class="font-display text-3xl font-bold">{{ player.first_name }} {{ player.last_name }}</h1>
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
      </template>
    </AsyncState>
  </PageLayout>
</template>
