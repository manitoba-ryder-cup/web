<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { PlayerProfile } from '@/api/types'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'

const props = defineProps<{ id: string }>()
const player = ref<PlayerProfile | null>(null)
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try { player.value = await scorecardApi.getPlayer(props.id) }
  catch (e) { error.value = String(e) }
  finally { loading.value = false }
})
</script>
<template>
  <ContentContainer>
    <div class="py-8">
      <RouterLink :to="{ name: 'players' }" class="text-sm text-mrc-accent hover:underline">← All players</RouterLink>
      <p v-if="loading" class="mt-4 text-mrc-muted">Loading…</p>
      <BaseAlert v-else-if="error" variant="error" class="mt-4">{{ error }}</BaseAlert>
      <template v-else-if="player">
        <div class="mt-4 flex items-center gap-4">
          <PlayerAvatar :photo-path="player.photo_path" :alt="`${player.first_name} ${player.last_name}`"
                        class="h-24 w-24 shrink-0 rounded-full border border-mrc-line object-cover object-top" />
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
    </div>
  </ContentContainer>
</template>
