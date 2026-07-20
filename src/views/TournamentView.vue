<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Tournament, TournamentTeam, WinnerResponse } from '@/api/types'
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import TeamStandingPanel from '@/components/tournament/TeamStandingPanel.vue'
import StandingsBar from '@/components/tournament/StandingsBar.vue'
import WinnerBanner from '@/components/tournament/WinnerBanner.vue'
import { formatDateRange } from '@/lib/date'

const props = defineProps<{ id: string }>()
const tournament = ref<Tournament | null>(null)
const teams = ref<TournamentTeam[]>([])
const winner = ref<WinnerResponse | null>(null)
const error = ref('')
const loading = ref(true)

const redTeam = computed(() => teams.value.find((t) => t.color === 'Red') ?? null)
const blueTeam = computed(() => teams.value.find((t) => t.color === 'Blue') ?? null)

const winnerColor = computed<'Red' | 'Blue' | 'Tied' | null>(() => {
  if (!winner.value?.finished) return null
  if (winner.value.winner_team_id === null) return 'Tied'
  const c = teams.value.find((t) => t.id === winner.value?.winner_team_id)?.color
  return c === 'Red' || c === 'Blue' ? c : 'Tied'
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
  <ImageHeader image="/img/crowd.webp">{{ tournament?.name ?? 'Leaderboard' }}</ImageHeader>
  <ContentContainer>
    <div class="py-8">
      <p v-if="loading" class="text-mrc-muted">Loading…</p>
      <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
      <template v-else-if="tournament">
        <header class="mb-6 text-center">
          <p class="text-mrc-muted">{{ tournament.location }}</p>
          <p class="text-sm text-mrc-faint">{{ formatDateRange(tournament.start_date, tournament.end_date) }}</p>
        </header>
        <BaseCard class="mb-6">
          <SectionHeader>Standings</SectionHeader>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <TeamStandingPanel color="Blue" :captain="captainName(blueTeam)" :points="blueTeam?.points ?? 0" />
            <TeamStandingPanel color="Red" :captain="captainName(redTeam)" :points="redTeam?.points ?? 0" />
          </div>
          <StandingsBar class="mt-4" :blue-points="blueTeam?.points ?? 0" :red-points="redTeam?.points ?? 0" />
        </BaseCard>
        <BaseCard>
          <WinnerBanner :winner-color="winnerColor" />
        </BaseCard>
      </template>
    </div>
  </ContentContainer>
</template>
