<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { PlayerRecord } from '@/api/types'
import PlayerAvatar from './PlayerAvatar.vue'
import TierBadge from '@/components/base/TierBadge.vue'

// A photo-forward player card: square headshot, then career form (W-L-T · cups). tier is
// shown only where a player has one (the current roster) — it's per-tournament, so the
// all-players listing omits it.
const props = defineProps<{
  id: string
  firstName: string
  lastName: string
  photoPath: string
  record: PlayerRecord
  cups: number
  tier?: string
}>()

const fullName = computed(() => `${props.firstName} ${props.lastName}`)
</script>
<template>
  <RouterLink :to="{ name: 'player', params: { id } }"
              class="group block overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow transition hover:shadow-lg">
    <div class="flex items-stretch">
      <PlayerAvatar :photo-path="photoPath" :alt="fullName" size="card" />
      <div class="flex min-w-0 flex-1 flex-col justify-center p-4">
        <TierBadge v-if="tier" :tier="tier" class="mb-1.5 self-start">{{ tier }}</TierBadge>
        <h4 class="truncate font-display text-2xl font-semibold text-mrc-ink transition group-hover:text-mrc-accent">
          {{ fullName }}
        </h4>
        <p class="mt-0.5 text-sm tabular-nums text-mrc-muted">
          {{ record.wins }}–{{ record.losses }}–{{ record.ties }}<template v-if="cups > 0"> · {{ cups }} {{ cups === 1 ? 'CUP' : 'CUPS' }}</template>
        </p>
      </div>
    </div>
  </RouterLink>
</template>
