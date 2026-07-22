<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'
import { playerInitials, playerSurnames, resultText } from '@/lib/matchResult'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchScorecard from '@/components/tournament/MatchScorecard.vue'

const props = defineProps<{ tournamentId: string; matchId: string }>()

// The results list carries the match's sides/result; the scores endpoint the played holes;
// the holes endpoint the tee set (par). Par is non-fatal — the card renders without it.
const { data, error, loading } = useAsync(() =>
  Promise.all([
    scorecardApi.getTournamentTeams(props.tournamentId),
    scorecardApi.getTournamentResults(props.tournamentId),
    scorecardApi.getMatchScores(props.matchId),
    scorecardApi.getMatchHoles(props.matchId).catch(() => []),
  ]),
  { intervalMs: 20000 },
)
// Same stable order as the tournament page (by id) so a team keeps its side.
const teams = computed(() => [...(data.value?.[0] ?? [])].sort((a, b) => a.id.localeCompare(b.id)))
const results = computed(() => data.value?.[1] ?? [])
const match = computed(() => results.value.find((m) => m.match_id === props.matchId) ?? null)
const holes = computed(() => data.value?.[2] ?? [])
const holeInfo = computed(() => new Map((data.value?.[3] ?? []).map((h) => [h.number, h])))

const { left, right } = useMatchSides(() => match.value, () => teams.value)
const leftTeam = computed(() => teams.value.find((t) => t.id === left.value?.team_id) ?? null)
const rightTeam = computed(() => teams.value.find((t) => t.id === right.value?.team_id) ?? null)
// Initials head the score columns (a w-14 cell fits nothing longer); the masthead
// directly above carries the surnames, which is what makes those initials readable.
const leftLabel = computed(() => (left.value ? playerInitials(left.value.players) : ''))
const rightLabel = computed(() => (right.value ? playerInitials(right.value.players) : ''))
const leftNames = computed(() => (left.value ? playerSurnames(left.value.players) : ''))
const rightNames = computed(() => (right.value ? playerSurnames(right.value.players) : ''))

</script>
<template>
  <!-- No image hero: the ScoreBar is the only thing worth pinning here, and a photo
       stacked under it pushed the card itself off a phone screen. The match identifies
       itself in text instead, the same way the hole-entry page does. -->
  <PageLayout>
    <!-- Overall event standing pinned to the top, so the team battle stays in view. -->
    <template #top>
      <ScoreBar v-if="teams.length >= 2" :results="results" :teams="teams" />
    </template>
    <AsyncState :loading="loading" :error="error">
      <template v-if="match && leftTeam && rightTeam">
        <!-- No summary row: the running state is already in the Match column and the Tot
             row, so the card's masthead only has to say who is playing and where. -->
        <MatchScorecard :holes="holes" :left-team="leftTeam" :right-team="rightTeam"
                        :left-label="leftLabel" :right-label="rightLabel" :hole-info="holeInfo"
                        :left-name="leftNames" :right-name="rightNames"
                        :course-name="match.course_name" :format-name="match.format_name"
                        :result-label="match.finished ? resultText(match) : undefined"
                        :tournament-id="tournamentId" :match-id="matchId" />
      </template>
      <p v-else class="mt-4 text-mrc-muted">Match not found.</p>
    </AsyncState>
  </PageLayout>
</template>
