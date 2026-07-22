<script setup lang="ts">
import type { TeamColorClasses } from '@/lib/teamColor'
import { scoreClass, type HoleRow } from './scorecard'
import ScoreMark from './ScoreMark.vue'

// One hole's row. Cells inherit the table's text size/alignment; only per-cell colour and
// the dark Hole/Par bands are set here. The whole row taps through to the hole's entry.
defineProps<{ row: HoleRow; leftMeta: TeamColorClasses; rightMeta: TeamColorClasses }>()
defineEmits<{ open: [hole: number] }>()
</script>
<template>
  <tr class="cursor-pointer divide-x divide-mrc-line border-t border-mrc-line hover:bg-mrc-accent/5"
      @click="$emit('open', row.hole)">
    <td class="bg-mrc-muted py-2 font-bold text-white">{{ row.hole }}</td>
    <td class="py-2 text-mrc-muted">{{ row.yards ?? '' }}</td>
    <td class="py-2" :class="scoreClass(row.leftWon, row.left, leftMeta)"><ScoreMark :score="row.left" :par="row.par" /></td>
    <td class="py-2" :class="scoreClass(row.rightWon, row.right, rightMeta)"><ScoreMark :score="row.right" :par="row.par" /></td>
    <td class="py-2 font-bold"><span v-if="row.state" class="whitespace-nowrap" :class="row.state.cls">{{ row.state.text }}</span></td>
    <td class="bg-mrc-muted py-2 font-semibold text-white">{{ row.par ?? '' }}</td>
    <td class="py-2 text-mrc-muted">{{ row.hdcp ?? '' }}</td>
  </tr>
</template>
