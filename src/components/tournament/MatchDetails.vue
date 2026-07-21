<script setup lang="ts">
import { computed } from 'vue'
import type { MatchResult } from '@/api/types'
import { matchOutcome } from '@/lib/matchResult'

// Big match-play status, rendered from the match's structured outcome (no parsing of
// a formatted string). textClass is the winning side's colour, resolved by the parent.
const props = defineProps<{ match: MatchResult; textClass: string }>()
const outcome = computed(() => matchOutcome(props.match))
</script>
<template>
  <div class="font-bold" :class="textClass">
    <div v-if="outcome.kind === 'up'" class="flex items-center justify-center">
      <span class="text-6xl">{{ outcome.lead }}</span>
      <span class="pt-2 text-2xl tracking-tighter">UP</span>
    </div>
    <div v-else-if="outcome.kind === 'margin'" class="flex items-center justify-center">
      <span class="text-6xl">{{ outcome.lead }}</span>
      <span class="mx-1 pt-1 text-3xl">&amp;</span>
      <span class="text-6xl">{{ outcome.holesRemaining }}</span>
    </div>
    <div v-else-if="outcome.kind === 'tied'" class="text-4xl">TIED</div>
    <div v-else class="text-lg">In progress</div>
  </div>
</template>
