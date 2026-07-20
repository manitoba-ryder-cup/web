<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Tournament } from '@/api/types'
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import TournamentCard from '@/components/tournament/TournamentCard.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const tournaments = ref<Tournament[]>([])
const error = ref('')

onMounted(async () => {
  try { tournaments.value = await scorecardApi.listTournaments() }
  catch (e) { error.value = String(e) }
})
</script>
<template>
  <ImageHeader image="/img/ocean-flag.webp">My Dashboard</ImageHeader>
  <ContentContainer>
    <div class="py-8">
      <BaseAlert v-if="error" variant="error">{{ error }}</BaseAlert>
      <div v-else-if="tournaments.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TournamentCard v-for="t in tournaments" :key="t.id"
                        :id="t.id" :name="t.name" :location="t.location"
                        :start-date="t.start_date" :end-date="t.end_date" />
      </div>
      <p v-else class="text-mrc-muted">No tournaments yet.</p>
    </div>
  </ContentContainer>
</template>
