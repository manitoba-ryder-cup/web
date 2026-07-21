<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import PlayerCard from '@/components/player/PlayerCard.vue'

const { data: players, error, loading } = useAsync(() => scorecardApi.listPlayers())
const sorted = computed(() =>
  [...(players.value ?? [])].sort((a, b) =>
    a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)))
</script>
<template>
  <PageLayout title="Players" image="/img/mountain-green.webp">
    <AsyncState :loading="loading" :error="error" :empty="!sorted.length" empty-text="No players yet.">
      <CardGrid>
        <PlayerCard v-for="p in sorted" :key="p.id" :id="p.id"
                    :first-name="p.first_name" :last-name="p.last_name" :photo-path="p.photo_path"
                    :record="p.record" />
      </CardGrid>
    </AsyncState>
  </PageLayout>
</template>
