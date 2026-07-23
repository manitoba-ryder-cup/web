<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'

// "Captain vs Captain" for a hero on a dark/photo background. Team colours by default
// (the dashboard centrepiece); `white` drops them where colour would be redundant next to
// a ScoreBar (the leaderboard). Teams arrive Blue-left/Red-right; identified by captain.
const props = withDefaults(defineProps<{ teams: TournamentTeam[]; size?: 'md' | 'lg'; white?: boolean }>(), {
  size: 'md',
  white: false,
})

const left = computed(() => props.teams[0] ?? null)
const right = computed(() => props.teams[1] ?? null)
const leftMeta = computed(() => teamColor(left.value?.color))
const rightMeta = computed(() => teamColor(right.value?.color))
</script>
<template>
  <div class="flex items-center justify-center gap-4 font-display font-bold uppercase leading-tight"
       :class="size === 'lg' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'">
    <span class="min-w-0 truncate" :class="white ? 'text-white' : leftMeta.softText">{{ left?.captain?.last_name }}</span>
    <span class="shrink-0 font-normal text-white" :class="size === 'lg' ? 'text-xl' : 'text-lg'">vs</span>
    <span class="min-w-0 truncate" :class="white ? 'text-white' : rightMeta.softText">{{ right?.captain?.last_name }}</span>
  </div>
</template>
