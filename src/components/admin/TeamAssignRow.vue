<script setup lang="ts">
import type { TournamentPlayer } from '@/api/types'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
import TierDot from '@/components/base/TierDot.vue'

// State is the parent's — the list enforces one captain a side, which a row cannot see.
const props = defineProps<{
  player: TournamentPlayer
  blueId: string | null
  redId: string | null
  busy: boolean
  showCaptain: boolean
  isCaptain: boolean
}>()
const emit = defineEmits<{
  (e: 'assign', target: string | null): void
  (e: 'toggle-captain'): void
}>()

// Tapping the active colour again clears the assignment.
function toggleTeam(teamId: string | null) {
  emit('assign', props.player.team_id === teamId ? null : teamId)
}
</script>
<template>
  <div class="flex items-center gap-3 border-b border-mrc-line px-3 py-2 last:border-b-0">
    <PlayerAvatar :photo-path="player.photo_path" :alt="`${player.first_name} ${player.last_name}`" size="sm" class="!h-10 !w-10" />
    <!-- Name + a small tier swatch (skill flight) right after it — informational only. -->
    <div class="flex min-w-0 flex-1 items-center gap-1.5">
      <span class="truncate font-semibold">{{ player.first_name }} {{ player.last_name }}</span>
      <TierDot :tier="player.tier" />
    </div>
    <!-- Captain (gold C). Shown only when actionable: on a captainless team (tap to set) or
         on the current captain (tap to clear). -->
    <button
      v-if="showCaptain"
      type="button"
      :disabled="busy"
      @click="emit('toggle-captain')"
      :aria-pressed="isCaptain"
      :title="isCaptain ? 'Captain — tap to clear' : 'Make captain'"
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition"
      :class="
        isCaptain ? 'border-mrc-gold bg-mrc-gold text-white' : 'border-mrc-line text-mrc-faint hover:border-mrc-gold hover:text-mrc-gold'
      "
    >
      C
    </button>
    <!-- Blue / Red, each a toggle: tap the active colour again to unassign. -->
    <div class="flex shrink-0 overflow-hidden rounded border border-mrc-line" role="group" :class="busy ? 'opacity-50' : ''">
      <button
        type="button"
        :disabled="busy"
        @click="toggleTeam(blueId)"
        class="w-14 py-1.5 text-sm font-semibold transition"
        :class="player.team_id === blueId ? 'bg-mrc-blue-team text-white' : 'bg-white text-mrc-muted hover:bg-mrc-blue-tint'"
      >
        Blue
      </button>
      <button
        type="button"
        :disabled="busy"
        @click="toggleTeam(redId)"
        class="w-14 border-l border-mrc-line py-1.5 text-sm font-semibold transition"
        :class="player.team_id === redId ? 'bg-mrc-red-team text-white' : 'bg-white text-mrc-muted hover:bg-mrc-red-tint'"
      >
        Red
      </button>
    </div>
  </div>
</template>
