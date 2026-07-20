<script setup lang="ts">
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import CardGrid from '@/components/layout/CardGrid.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'

const { data: tournaments, error, loading } = useAsync(() => scorecardApi.listTournaments())
</script>
<template>
  <PageLayout title="History" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :empty="!(tournaments?.length)" empty-text="No tournaments yet.">
      <CardGrid>
        <TournamentCard v-for="t in tournaments ?? []" :key="t.id"
                        :id="t.id" :name="t.name" :location="t.location"
                        :start-date="t.start_date" :end-date="t.end_date" />
      </CardGrid>
    </AsyncState>
  </PageLayout>
</template>
