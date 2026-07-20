<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Player } from '@/api/types'
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const players = ref<Player[]>([])
const error = ref('')
const loading = ref(true)
const sorted = computed(() =>
  [...players.value].sort((a, b) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)))

onMounted(async () => {
  try { players.value = await scorecardApi.listPlayers() }
  catch (e) { error.value = String(e) }
  finally { loading.value = false }
})
</script>
<template>
  <ImageHeader image="/img/mountain-green.webp">Players</ImageHeader>
  <ContentContainer>
    <div class="py-8">
      <p v-if="loading" class="text-mrc-muted">Loading…</p>
      <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
      <div v-else-if="sorted.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlayerCard v-for="p in sorted" :key="p.id" :id="p.id"
                    :first-name="p.first_name" :last-name="p.last_name" :photo-path="p.photo_path" />
      </div>
      <p v-else class="text-mrc-muted">No players yet.</p>
    </div>
  </ContentContainer>
</template>
