<script setup lang="ts">
import type { TournamentPlayer, TournamentTeam } from '@/api/types'
import PlayerRow from './PlayerRow.vue'

// The two drafted rosters, side by side, as a team sheet. Team colour isn't shown — teams
// are identified by their captain, not a colour.
const props = defineProps<{ players: TournamentPlayer[]; teams: TournamentTeam[] }>()

// Group by tier (keeping same-tier players together), then by surname within a tier.
function roster(teamId: string): TournamentPlayer[] {
  return props.players
    .filter((p) => p.team_id === teamId)
    .sort((a, b) => a.tier.localeCompare(b.tier) || a.last_name.localeCompare(b.last_name))
}
</script>
<template>
  <div class="grid grid-cols-2 gap-x-4">
    <div v-for="team in teams" :key="team.id">
      <!-- Team header: the captain, who identifies the team. -->
      <div class="mb-1 truncate border-b border-mrc-muted pb-1 text-center font-display font-bold uppercase tracking-wide text-mrc-muted">
        Team {{ team.captain?.last_name }}
      </div>
      <ul class="divide-y divide-mrc-line">
        <li v-for="p in roster(team.id)" :key="p.player_id">
          <PlayerRow :player="p" />
        </li>
      </ul>
    </div>
  </div>
</template>
