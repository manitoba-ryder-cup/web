<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { sessionInPlay } from '@/lib/sessions'
import BaseTabs from '@/components/base/BaseTabs.vue'
import MatchOverview from './MatchOverview.vue'

const props = defineProps<{ matches: MatchResult[]; teams: TournamentTeam[]; tournamentId: string }>()

// Group by format, preserving first-seen order (results arrive ordered by tee time).
const grouped = computed(() => {
  const order: string[] = []
  const byFormat: Record<string, MatchResult[]> = {}
  for (const m of props.matches) {
    if (!byFormat[m.format_name]) {
      byFormat[m.format_name] = []
      order.push(m.format_name)
    }
    byFormat[m.format_name].push(m)
  }
  return { order, byFormat }
})

const openOn = computed(() => sessionInPlay(props.matches)?.format)
</script>
<template>
  <BaseTabs :tabs="grouped.order" :initial="openOn" v-slot="{ tab }">
    <!-- Tab bar is full-bleed (the parent applies -mx-4); pad the content back in. -->
    <div class="px-2">
      <RouterLink
        v-for="m in grouped.byFormat[tab]"
        :key="m.match_id"
        :to="{ name: 'match', params: { tournamentId, matchId: m.match_id } }"
        class="block"
      >
        <MatchOverview :match="m" :teams="teams" />
      </RouterLink>
    </div>
  </BaseTabs>
</template>
