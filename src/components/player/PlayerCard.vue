<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { PlayerRecord } from '@/api/types'
import PlayerAvatar from './PlayerAvatar.vue'
import TierBadge from '@/components/base/TierBadge.vue'

// A photo-forward player card: square headshot, then career form (W-L-T · cups). tier is
// shown only where a player has one (the current roster) — it's per-tournament, so the
// all-players listing omits it.
//
// tournamentId follows the same rule, and opens the profile with that cup already
// expanded: a card showing this year's flight should land on this year's write-up rather
// than make you find it, and the rest of the player's career is right there under it.
const props = defineProps<{
  id: string
  firstName: string
  lastName: string
  photoPath: string
  record: PlayerRecord
  cups: number
  tier?: string
  tournamentId?: string
}>()

const fullName = computed(() => `${props.firstName} ${props.lastName}`)
const to = computed(() => ({
  name: 'player',
  params: { id: props.id },
  ...(props.tournamentId ? { hash: `#${props.tournamentId}` } : {}),
}))
</script>
<template>
  <RouterLink
    :to="to"
    class="group block overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow transition hover:shadow-lg"
  >
    <div class="flex items-stretch">
      <PlayerAvatar :photo-path="photoPath" :alt="fullName" size="card" />
      <div class="flex min-w-0 flex-1 flex-col justify-center p-4">
        <TierBadge :tier="tier" class="mb-1.5 self-start" />
        <h3 class="truncate transition group-hover:text-mrc-accent">
          {{ fullName }}
        </h3>
        <p class="mt-0.5 text-sm tabular-nums text-mrc-muted">
          {{ record.wins }}–{{ record.losses }}–{{ record.ties
          }}<template v-if="cups > 0"> · {{ cups }} {{ cups === 1 ? 'CUP' : 'CUPS' }}</template>
        </p>
      </div>
    </div>
  </RouterLink>
</template>
