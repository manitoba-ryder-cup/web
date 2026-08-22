<script setup lang="ts">
import type { TeamColorClasses } from '@/lib/teamColor'
import { scoreClass, type HoleRow } from './scorecard'
import ScoreMark from './ScoreMark.vue'

// Untappable rows say so by not inviting the tap: there is nowhere useful to go.
withDefaults(defineProps<{ row: HoleRow; leftMeta: TeamColorClasses; rightMeta: TeamColorClasses; tappable?: boolean }>(), {
  tappable: true,
})
defineEmits<{ open: [hole: number] }>()
</script>
<template>
  <tr
    class="divide-x divide-mrc-line border-t border-mrc-line"
    :class="tappable ? 'cursor-pointer hover:bg-mrc-accent/5' : ''"
    @click="tappable && $emit('open', row.hole)"
  >
    <td class="bg-mrc-muted py-2 font-bold text-white">{{ row.hole }}</td>
    <td class="py-2 text-mrc-muted">{{ row.yards ?? '' }}</td>
    <td class="py-2" :class="scoreClass(row.leftWon, row.left, leftMeta)"><ScoreMark :score="row.left" :par="row.par" /></td>
    <td class="py-2" :class="scoreClass(row.rightWon, row.right, rightMeta)"><ScoreMark :score="row.right" :par="row.par" /></td>
    <td class="py-2 font-bold">
      <span v-if="row.state" class="whitespace-nowrap" :class="row.state.cls">{{ row.state.text }}</span>
    </td>
    <td class="bg-mrc-muted py-2 font-semibold text-white">{{ row.par ?? '' }}</td>
    <td class="py-2 text-mrc-muted">{{ row.hdcp ?? '' }}</td>
  </tr>
</template>
