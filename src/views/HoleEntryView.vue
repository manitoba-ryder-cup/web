<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { provideBackLink } from '@/composables/useBackLink'
import PageLayout from '@/components/layout/PageLayout.vue'

// Placeholder for the per-hole score-entry page (the write flow). The hole list taps
// through here so the navigation is wired end to end; the entry form lands next.
const props = defineProps<{ tournamentId: string; matchId: string; hole: string }>()

provideBackLink(() => ({
  to: { name: 'match', params: { tournamentId: props.tournamentId, matchId: props.matchId } },
  label: 'Match',
}))
</script>
<template>
  <PageLayout>
    <RouterLink :to="{ name: 'match', params: { tournamentId, matchId } }"
                class="hidden text-sm text-mrc-accent hover:underline md:inline-block">← Match</RouterLink>
    <div class="mt-10 text-center">
      <p class="text-xs uppercase tracking-wide text-mrc-muted">Hole</p>
      <p class="font-display text-6xl font-bold leading-none text-mrc-ink">{{ hole }}</p>
      <p class="mt-6 text-mrc-muted">Score entry is coming soon.</p>
    </div>
  </PageLayout>
</template>
