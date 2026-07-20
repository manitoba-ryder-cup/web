<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Tournament, TournamentTeam, WinnerResponse } from '@/api/types'
import { formatDateRange } from '@/lib/date'

const props = defineProps<{ id: string }>()

const tournament = ref<Tournament | null>(null)
const teams = ref<TournamentTeam[]>([])
const winner = ref<WinnerResponse | null>(null)
const error = ref('')
const loading = ref(true)

// Look up by color rather than array position: the API doesn't guarantee team
// ordering, and color is the stable, meaningful key ("Red"/"Blue").
const redTeam = computed(() => teams.value.find((t) => t.color === 'Red') ?? null)
const blueTeam = computed(() => teams.value.find((t) => t.color === 'Blue') ?? null)

// Winning team's color, "Tied" when winner_team_id is null, or null if not finished yet.
const winnerColor = computed(() => {
  if (!winner.value?.finished) return null
  if (winner.value.winner_team_id === null) return 'Tied'
  return teams.value.find((t) => t.id === winner.value?.winner_team_id)?.color ?? 'Unknown'
})

// Proportional bar width; guards the 0-0 case so the divisor is never zero.
const redSharePct = computed(() => {
  const total = (redTeam.value?.points ?? 0) + (blueTeam.value?.points ?? 0)
  return total === 0 ? 50 : ((redTeam.value?.points ?? 0) / total) * 100
})

function captainName(team: TournamentTeam | null): string {
  if (!team?.captain) return 'No captain assigned'
  return `${team.captain.first_name} ${team.captain.last_name}`
}

onMounted(async () => {
  try {
    const [t, tm, w] = await Promise.all([
      scorecardApi.getTournament(props.id),
      scorecardApi.getTournamentTeams(props.id),
      scorecardApi.getTournamentWinner(props.id),
    ])
    tournament.value = t
    teams.value = tm
    winner.value = w
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
})
</script>
<template>
  <section>
    <p v-if="loading" class="text-slate-500">Loading…</p>
    <p v-if="error" class="text-red-600">{{ error }}</p>

    <template v-if="!loading && tournament">
      <header class="mb-6">
        <h2 class="font-display text-2xl font-bold">{{ tournament.name }}</h2>
        <p class="text-slate-600">{{ tournament.location }}</p>
        <p class="text-sm text-slate-500">{{ formatDateRange(tournament.start_date, tournament.end_date) }}</p>
      </header>

      <section class="mb-6 rounded border bg-white p-4">
        <h3 class="mb-3 text-lg font-semibold">Standings</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h4 class="font-display font-semibold text-mrc-red">Red</h4>
            <p class="text-sm text-slate-500">{{ captainName(redTeam) }}</p>
            <p class="text-3xl font-bold text-mrc-red">{{ redTeam?.points ?? 0 }}</p>
          </div>
          <div>
            <h4 class="font-display font-semibold text-mrc-blue">Blue</h4>
            <p class="text-sm text-slate-500">{{ captainName(blueTeam) }}</p>
            <p class="text-3xl font-bold text-mrc-blue">{{ blueTeam?.points ?? 0 }}</p>
          </div>
        </div>
        <div class="mt-4 h-3 w-full overflow-hidden rounded bg-mrc-blue">
          <div class="h-full bg-mrc-red" :style="{ width: `${redSharePct}%` }" />
        </div>
      </section>

      <section class="rounded border bg-white p-4">
        <p v-if="winnerColor === 'Tied'" class="font-semibold">Tied</p>
        <p v-else-if="winnerColor" class="font-semibold">
          <span :class="winnerColor === 'Red' ? 'text-mrc-red' : 'text-mrc-blue'">{{ winnerColor }}</span> wins
        </p>
        <p v-else class="text-slate-500">In progress</p>
      </section>
    </template>
  </section>
</template>
