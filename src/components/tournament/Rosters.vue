<script setup lang="ts">
import { computed } from 'vue'
import type { TournamentPlayer, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import PlayerRow from './PlayerRow.vue'

// The two drafted rosters, side by side, as a team sheet. Named by captain, painted by
// colour: blue-left/red-right already governs which column a team lands in, so the header
// says which is which rather than leaving it to be inferred from the order.
//
// Capped rather than filling the content column: each row pins its tier dot right, and a
// full-width desktop column strands the dot a paragraph from the name it belongs to.
const props = defineProps<{ players: TournamentPlayer[]; teams: TournamentTeam[] }>()

// Captain first — the column is headed with his name, so he leads it rather than turning up
// somewhere in the middle of his own team. Then tier (a flight stays together), then surname.
function roster(team: TournamentTeam): TournamentPlayer[] {
  const isCaptain = (p: TournamentPlayer) => Number(p.player_id === team.captain?.id)
  return props.players
    .filter((p) => p.team_id === team.id)
    .sort((a, b) => isCaptain(b) - isCaptain(a) || a.tier.localeCompare(b.tier) || a.last_name.localeCompare(b.last_name))
}

const columns = computed(() => props.teams.map((team) => ({ team, colors: teamColor(team.color), players: roster(team) })))
</script>
<template>
  <div class="mx-auto grid max-w-2xl grid-cols-2 gap-x-4">
    <div v-for="{ team, colors, players: side } in columns" :key="team.id">
      <!-- The colour is the fill, not a dot beside the name: every row below already ends in
           a tier dot of the same size, drawn from an overlapping set of colours. -->
      <div
        class="mb-2 truncate rounded-md px-2 py-2 text-center font-display font-bold text-lg uppercase tracking-wide"
        :class="[colors.tint, colors.textStrong]"
      >
        Team {{ team.captain?.last_name }}
      </div>
      <ul class="divide-y divide-mrc-line">
        <li v-for="p in side" :key="p.player_id">
          <PlayerRow :player="p" />
        </li>
      </ul>
    </div>
  </div>
</template>
