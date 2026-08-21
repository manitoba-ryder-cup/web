<script setup lang="ts">
import type { TeamColorClasses } from '@/lib/teamColor'
import type { HoleDetail } from './scorecard'

// What each player made on one hole, opened from the row above it. Only a fourball has
// anything to say here: every other format records one score per side, which the row
// already shows, and the card offers no tap where there is nothing behind it.
defineProps<{ detail: HoleDetail; leftMeta: TeamColorClasses; rightMeta: TeamColorClasses }>()
</script>
<template>
  <tr class="border-t border-mrc-line bg-mrc-panel">
    <td colspan="7" class="px-3 py-2 text-left">
      <div class="grid grid-cols-2 gap-x-3">
        <ul>
          <li v-for="p in detail.left" :key="p.playerId" class="flex items-baseline justify-between gap-2 py-0.5">
            <span class="min-w-0 truncate text-sm text-mrc-charcoal">{{ p.name }}</span>
            <span class="shrink-0 font-semibold tabular-nums" :class="p.counted ? leftMeta.textStrong : 'text-mrc-muted'">
              {{ p.strokes ?? '–' }}
            </span>
          </li>
        </ul>
        <ul>
          <li v-for="p in detail.right" :key="p.playerId" class="flex items-baseline justify-between gap-2 py-0.5">
            <span class="min-w-0 truncate text-sm text-mrc-charcoal">{{ p.name }}</span>
            <span class="shrink-0 font-semibold tabular-nums" :class="p.counted ? rightMeta.textStrong : 'text-mrc-muted'">
              {{ p.strokes ?? '–' }}
            </span>
          </li>
        </ul>
      </div>
    </td>
  </tr>
</template>
