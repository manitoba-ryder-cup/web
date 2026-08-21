<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMatchContext } from '@/composables/useMatchContext'
import { playerInitials, resultText } from '@/lib/matchResult'
import { formatTeeTime } from '@/lib/teeTime'
import { hasStarted } from '@/lib/scoringWindow'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import MatchScorecard from '@/components/tournament/MatchScorecard.vue'
import { SCOPE_SCORES_WRITE, SCOPE_TOURNAMENTS_WRITE } from '@/api/scopes'

const props = defineProps<{ tournamentId: string; matchId: string }>()

const auth = useAuthStore()

// Polls, so a spectator watching the round sees it move. Par is non-fatal here — the
// card renders without it.
const { error, loading, retry, teams, results, holeStates, holes, match, left, right } = useMatchContext(
  props.tournamentId,
  props.matchId,
  {
    intervalMs: 20000,
    parOptional: true,
  },
)
const holeInfo = computed(() => new Map(holes.value.map((h) => [h.number, h])))
const leftTeam = computed(() => teams.value.find((t) => t.id === left.value?.team_id) ?? null)
const rightTeam = computed(() => teams.value.find((t) => t.id === right.value?.team_id) ?? null)
const leftLabel = computed(() => (left.value ? playerInitials(left.value.players) : ''))
const rightLabel = computed(() => (right.value ? playerInitials(right.value.players) : ''))
// A hole taps through to its entry page only for someone who can record one. Everyone
// else gets what each player made, opened in the card rather than on a page whose wheels
// they could not turn.
const canScore = computed(() => auth.hasScope(SCOPE_SCORES_WRITE))
</script>
<template>
  <!-- No image hero: the ScoreBar is the only thing worth pinning here, and a photo
       stacked under it pushed the card itself off a phone screen. The match identifies
       itself in text instead, the same way the hole-entry page does. -->
  <PageLayout>
    <!-- Overall event standing pinned to the top, so the team battle stays in view. -->
    <template #top>
      <!-- ScoreBar's own h-20 and white wrapper, so the swap costs no height. -->
      <div v-if="loading" data-testid="scorebar-skeleton" class="bg-mrc-surface shadow">
        <SkeletonBlock radius="none" class="h-20 w-full" />
      </div>
      <ScoreBar v-else-if="teams.length >= 2" :results="results" :teams="teams" />
    </template>
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- Hand-built rather than a shared composition: an 18-hole card is a shape nothing
             else in the app has, and forcing it through SkeletonList would reserve the wrong
             height on the one page where the card is the whole point. -->
        <div class="mx-auto mb-4 max-w-2xl">
          <SkeletonBlock radius="md" class="h-16 w-full" />
        </div>
        <div class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface" data-testid="skeleton">
          <div class="border-b border-mrc-line px-3 py-2">
            <SkeletonBlock class="h-4 w-40" />
          </div>
          <div v-for="n in 6" :key="n" class="flex gap-2 border-b border-mrc-line px-3 py-2 last:border-b-0">
            <SkeletonBlock class="h-4 w-10" />
            <SkeletonBlock class="h-4 flex-1" />
            <SkeletonBlock class="h-4 w-10" />
          </div>
        </div>
      </template>
      <template v-if="match && leftTeam && rightTeam">
        <!-- The scores row you tapped, reused as this page's heading: it names both
             sides AND states the result at a fixed position. The Match column and the Tot
             row carry the result too, but neither sits anywhere predictable — the Match
             column's last filled cell moves as the round goes on, and Tot means scrolling.
             Width-matched to the card below. -->
        <div class="mx-auto mb-4 max-w-2xl">
          <MatchSummary :match="match" :teams="teams" />
        </div>
        <MatchScorecard
          :hole-states="holeStates"
          :left-team="leftTeam"
          :right-team="rightTeam"
          :left-label="leftLabel"
          :right-label="rightLabel"
          :hole-info="holeInfo"
          :course-name="match.course_name"
          :format-name="match.format_name"
          :result-label="match.finished ? resultText(match) : undefined"
          :tournament-id="tournamentId"
          :match-id="matchId"
          :left-players="left?.players"
          :right-players="right?.players"
          :tappable="hasStarted(match) && canScore"
        />
      </template>
      <!-- The match exists on the schedule but has no lineup yet — show its context and say
           so, rather than a misleading "not found" (it becomes the real scorecard once the
           lineup is set). -->
      <div v-else-if="match" class="mx-auto mt-6 max-w-2xl text-center">
        <p class="text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          · {{ formatTeeTime(match.tee_time) }}
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>
        <p class="mt-6 text-mrc-muted">The lineup for this match hasn't been set yet.</p>
        <!-- For an admin this empty state's whole purpose is to set the lineup, so it gets a
             real button. It needs the scope the lineup page itself requires, or it would
             offer a scorer a link that bounces them back. -->
        <RouterLink
          v-if="auth.hasScope(SCOPE_TOURNAMENTS_WRITE)"
          :to="{ name: 'admin-lineup', params: { id: tournamentId, matchId } }"
          class="mt-6 inline-flex items-center justify-center rounded bg-mrc-accent px-6 py-2 font-semibold text-white shadow-md transition hover:bg-mrc-accent-dark"
        >
          Set lineup
        </RouterLink>
      </div>
      <p v-else class="mt-4 text-mrc-muted">Match not found.</p>
    </AsyncState>
  </PageLayout>
</template>
