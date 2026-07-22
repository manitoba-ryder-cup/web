<script setup lang="ts">
import { computed } from 'vue'

// A subtotal band: OUT / IN, or (total) the TOT row, which is emphasised with a heavier
// top rule, ink text, and the match result in the Match column.
const props = defineProps<{
  label: string
  yards: number | null
  left: number | null
  right: number | null
  par: number | null
  total?: boolean
  result?: string
  resultCls?: string
}>()

const pad = computed(() => (props.total ? 'py-2' : 'py-1.5'))
</script>
<template>
  <tr class="divide-x divide-mrc-line bg-mrc-panel-alt font-semibold uppercase tracking-wide"
      :class="total ? 'border-t-2 border-mrc-ink text-mrc-ink' : 'border-t border-mrc-line text-mrc-muted'">
    <td class="bg-mrc-muted text-white" :class="pad">{{ label }}</td>
    <td class="text-mrc-ink" :class="pad">{{ yards ?? '' }}</td>
    <td class="text-mrc-ink" :class="pad">{{ left ?? '' }}</td>
    <td class="text-mrc-ink" :class="pad">{{ right ?? '' }}</td>
    <td class="font-bold" :class="[pad, resultCls]">{{ result ?? '' }}</td>
    <td class="bg-mrc-muted text-white" :class="pad">{{ par ?? '' }}</td>
    <td></td>
  </tr>
</template>
