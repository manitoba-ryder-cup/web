<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'

// Everyone who has ever played, by surname. See CupArchive for why the fetch sits in the
// panel: this one is the half most visitors never open, and it is the longer list.
const { data, error, loading, retry } = useAsync(['players', 'all'], async () => {
  const list = await scorecardApi.listPlayers()
  return [...list].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name))
})

const players = computed(() => data.value ?? [])
</script>
<template>
  <AsyncState :loading="loading" :error="error" :retry="retry">
    <template #loading><SkeletonGrid :cards="9" /></template>
    <p v-if="!players.length" class="text-center text-mrc-muted">No players yet.</p>
    <CardGrid v-else>
      <!-- `from` so the profile's back link offers the list it was tapped in. -->
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
  </AsyncState>
</template>
