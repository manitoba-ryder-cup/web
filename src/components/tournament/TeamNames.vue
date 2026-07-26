<script setup lang="ts">
import type { MatchPlayer } from '@/api/types'
// borderClass carries the team's accent border (resolved by the parent from the
// team's colour); this component knows nothing about specific colours.
defineProps<{ players: MatchPlayer[]; align: 'left' | 'right'; borderClass: string }>()
</script>
<template>
  <div class="flex w-2/5 items-center px-3 py-4 leading-tight" :class="[borderClass, align === 'right' ? 'justify-end text-right' : '']">
    <div>
      <template v-for="(p, i) in players" :key="p.player_id">
        <div class="italic" :class="i > 0 ? 'mt-3' : ''">{{ p.first_name }}</div>
        <div class="font-semibold uppercase">{{ p.last_name }}</div>
      </template>
    </div>
  </div>
</template>
