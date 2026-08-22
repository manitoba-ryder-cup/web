<script setup lang="ts">
import type { TournamentTeam } from '@/api/types'
import { useTeamPair } from '@/composables/useTeamPair'
// `white` drops the team colours where they would be redundant beside a ScoreBar.
const props = withDefaults(defineProps<{ teams: TournamentTeam[]; size?: 'md' | 'lg'; white?: boolean }>(), {
  size: 'md',
  white: false,
})
const { left, right, leftColors, rightColors } = useTeamPair(() => props.teams)
</script>
<template>
  <div
    class="flex items-center justify-center gap-4 font-display font-bold uppercase leading-tight"
    :class="size === 'lg' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'"
  >
    <span class="min-w-0 truncate" :class="white ? 'text-white' : leftColors.softText">{{ left?.captain?.last_name }}</span>
    <span class="shrink-0 font-normal text-white" :class="size === 'lg' ? 'text-xl' : 'text-lg'">vs</span>
    <span class="min-w-0 truncate" :class="white ? 'text-white' : rightColors.softText">{{ right?.captain?.last_name }}</span>
  </div>
</template>
