<script setup lang="ts">
import type { MatchResult } from '@/api/types'
import { resultText, playerNames } from '@/lib/matchResult'
const props = defineProps<{ match: MatchResult }>()
const result = resultText(props.match)
const blueWon = props.match.winner_color === 'Blue'
const redWon = props.match.winner_color === 'Red'
</script>
<template>
  <div class="flex items-stretch gap-2 py-2 text-center text-sm">
    <div class="w-2/5 rounded px-2 py-2 leading-tight"
         :class="blueWon ? 'bg-mrc-blue-team font-semibold text-white' : 'bg-mrc-panel text-mrc-ink'">
      {{ playerNames(match.blue_players) }}
    </div>
    <div class="flex w-1/5 items-center justify-center rounded border border-mrc-line px-1 font-semibold uppercase tracking-wide">
      {{ result }}
    </div>
    <div class="w-2/5 rounded px-2 py-2 leading-tight"
         :class="redWon ? 'bg-mrc-red-team font-semibold text-white' : 'bg-mrc-panel text-mrc-ink'">
      {{ playerNames(match.red_players) }}
    </div>
  </div>
</template>
