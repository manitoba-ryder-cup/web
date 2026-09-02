<script setup lang="ts">
import { computed } from 'vue'
import type { MatchPlayer } from '@/api/types'
// The parent resolves borderClass and fill from the team's colour; nothing here names one.
const props = defineProps<{
  players: MatchPlayer[]
  align: 'left' | 'right'
  borderClass: string
  fill?: { panel: string; ink: string } | null
}>()

// The point aims at the result, so shape carries the win and colour only says whose. The names
// stop short of the panel's edge, where a long one would run off it and be white on white.
const side = computed(() =>
  props.align === 'right'
    ? {
        box: 'justify-end text-right',
        panel: 'right-0 left-7',
        names: 'pl-5',
        clip: 'polygon(100% 0, 1.25rem 0, 0 50%, 1.25rem 100%, 100% 100%)',
      }
    : {
        box: '',
        panel: 'left-0 right-7',
        names: 'pr-5',
        clip: 'polygon(0 0, calc(100% - 1.25rem) 0, 100% 50%, calc(100% - 1.25rem) 100%, 0 100%)',
      },
)
</script>
<template>
  <div class="relative flex w-2/5 items-center px-3 py-4 leading-tight" :class="[borderClass, side.box]">
    <div v-if="fill" class="absolute inset-y-0" :class="[fill.panel, side.panel]" :style="{ clipPath: side.clip }" />
    <div class="relative" :class="[fill?.ink, fill ? side.names : '']">
      <template v-for="(p, i) in players" :key="p.player_id">
        <div class="italic tracking-tight" :class="i > 0 ? 'mt-3' : ''">{{ p.first_name }}</div>
        <div class="font-semibold uppercase tracking-tight">{{ p.last_name }}</div>
      </template>
    </div>
  </div>
</template>
