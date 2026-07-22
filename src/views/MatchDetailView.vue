<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'
import { provideBackLink } from '@/composables/useBackLink'
import { playerInitials, resultText } from '@/lib/matchResult'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import MatchScorecard from '@/components/tournament/MatchScorecard.vue'

const props = defineProps<{ tournamentId: string; matchId: string }>()

// On mobile the header shows this as a contextual back bar (replacing the wordmark).
provideBackLink(() => ({ to: { name: 'tournament', params: { id: props.tournamentId } }, label: 'Leaderboard' }))

// The results list carries the match's sides/result; the scores endpoint the played holes;
// the holes endpoint the tee set (par). Par is non-fatal — the card renders without it.
const { data, error, loading } = useAsync(() =>
  Promise.all([
    scorecardApi.getTournamentTeams(props.tournamentId),
    scorecardApi.getTournamentResults(props.tournamentId),
    scorecardApi.getMatchScores(props.matchId),
    scorecardApi.getMatchHoles(props.matchId).catch(() => []),
  ]),
)
// Same stable order as the tournament page (by id) so a team keeps its side.
const teams = computed(() => [...(data.value?.[0] ?? [])].sort((a, b) => a.id.localeCompare(b.id)))
const match = computed(() => (data.value?.[1] ?? []).find((m) => m.match_id === props.matchId) ?? null)
const holes = computed(() => data.value?.[2] ?? [])
const holeInfo = computed(() => new Map((data.value?.[3] ?? []).map((h) => [h.number, h])))

const { left, right } = useMatchSides(() => match.value, () => teams.value)
const leftTeam = computed(() => teams.value.find((t) => t.id === left.value?.team_id) ?? null)
const rightTeam = computed(() => teams.value.find((t) => t.id === right.value?.team_id) ?? null)
const leftLabel = computed(() => (left.value ? playerInitials(left.value.players) : ''))
const rightLabel = computed(() => (right.value ? playerInitials(right.value.players) : ''))

// Tee time is shown in its stored (UTC) wall-clock, so it reads as the time that was set
// rather than shifting into the viewer's zone. Empty when the match is unscheduled.
const teeTime = computed(() => {
  const iso = match.value?.tee_time
  if (!iso) return ''
  const d = new Date(iso)
  // Match the old app's long form: "Saturday, August 1, 8:00 AM".
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(d)
  return `${date}, ${time}`
})
</script>
<template>
  <PageLayout title="Scorecard" :below="teeTime" image="/img/ocean-green.webp">
    <AsyncState :loading="loading" :error="error">
      <template v-if="match && leftTeam && rightTeam">
        <MatchScorecard :holes="holes" :left-team="leftTeam" :right-team="rightTeam"
                        :left-label="leftLabel" :right-label="rightLabel" :hole-info="holeInfo"
                        :result-label="match.finished ? resultText(match) : undefined"
                        :tournament-id="tournamentId" :match-id="matchId" />
      </template>
      <p v-else class="mt-4 text-mrc-muted">Match not found.</p>
    </AsyncState>
  </PageLayout>
</template>
