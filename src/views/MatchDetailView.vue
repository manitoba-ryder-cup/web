<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { useAuthStore } from '@/stores/auth'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'
import { playerInitials, resultText } from '@/lib/matchResult'
import { formatTeeTime } from '@/lib/teeTime'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import MatchScorecard from '@/components/tournament/MatchScorecard.vue'

const props = defineProps<{ tournamentId: string; matchId: string }>()

const auth = useAuthStore()

// The results list carries the match's sides/result; the scores endpoint the played holes;
// the holes endpoint the tee set (par). Par is non-fatal — the card renders without it.
const { data, error, loading } = useAsync(
  async () => {
    const [teams, results, holeStates, holes] = await Promise.all([
      scorecardApi.getTournamentTeams(props.tournamentId),
      scorecardApi.getTournamentResults(props.tournamentId),
      scorecardApi.getMatchScores(props.matchId),
      scorecardApi.getMatchHoles(props.matchId).catch(() => []),
    ])
    return { teams, results, holeStates, holes }
  },
  { intervalMs: 20000 },
)
const teams = computed(() => data.value?.teams ?? [])
const results = computed(() => data.value?.results ?? [])
const match = computed(() => results.value.find((m) => m.match_id === props.matchId) ?? null)
// holeStates is the per-hole match state (who's up); holeInfo is the tee set's par/yardage.
const holeStates = computed(() => data.value?.holeStates ?? [])
const holeInfo = computed(() => new Map((data.value?.holes ?? []).map((h) => [h.number, h])))

const { left, right } = useMatchSides(() => match.value, () => teams.value)
const leftTeam = computed(() => teams.value.find((t) => t.id === left.value?.team_id) ?? null)
const rightTeam = computed(() => teams.value.find((t) => t.id === right.value?.team_id) ?? null)
const leftLabel = computed(() => (left.value ? playerInitials(left.value.players) : ''))
const rightLabel = computed(() => (right.value ? playerInitials(right.value.players) : ''))

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
        <!-- The leaderboard row you tapped, reused as this page's heading: it names both
             sides AND states the result at a fixed position. The Match column and the Tot
             row carry the result too, but neither sits anywhere predictable — the Match
             column's last filled cell moves as the round goes on, and Tot means scrolling.
             Width-matched to the card below. -->
        <div class="mx-auto mb-4 max-w-2xl">
          <MatchSummary :match="match" :teams="teams" />
          <div v-if="auth.isAuthenticated" class="mt-2 text-right">
            <RouterLink :to="{ name: 'admin-lineup', params: { id: tournamentId, matchId } }"
                        class="text-sm font-semibold text-mrc-accent hover:underline">Set lineup →</RouterLink>
          </div>
        </div>
        <MatchScorecard :hole-states="holeStates" :left-team="leftTeam" :right-team="rightTeam"
                        :left-label="leftLabel" :right-label="rightLabel" :hole-info="holeInfo"
                        :course-name="match.course_name" :format-name="match.format_name"
                        :result-label="match.finished ? resultText(match) : undefined"
                        :tournament-id="tournamentId" :match-id="matchId" />
      </template>
      <!-- The match exists on the schedule but has no lineup yet — show its context and say
           so, rather than a misleading "not found" (it becomes the real scorecard once the
           lineup is set). -->
      <div v-else-if="match" class="mx-auto mt-6 max-w-2xl text-center">
        <p class="text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          <template v-if="formatTeeTime(match.tee_time)"> · {{ formatTeeTime(match.tee_time) }}</template>
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>
        <p class="mt-6 text-mrc-muted">The lineup for this match hasn't been set yet.</p>
        <!-- For an admin this empty state's whole purpose is to set the lineup, so it gets a
             real button; it only shows when logged in, so public viewers never see it. -->
        <RouterLink v-if="auth.isAuthenticated"
                    :to="{ name: 'admin-lineup', params: { id: tournamentId, matchId } }"
                    class="mt-6 inline-flex items-center justify-center rounded bg-mrc-accent px-6 py-2 font-semibold text-white shadow-md transition hover:bg-mrc-accent-dark">
          Set lineup
        </RouterLink>
      </div>
      <p v-else class="mt-4 text-mrc-muted">Match not found.</p>
    </AsyncState>
  </PageLayout>
</template>
