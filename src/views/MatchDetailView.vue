<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { scorecardApi } from '@/api/scorecard'
import { useBusy } from '@/composables/useBusy'
import { toast } from '@/composables/useToast'
import { useMatchContext } from '@/composables/useMatchContext'
import { useAfterMatchWrite } from '@/composables/useAfterWrite'
import { useCoarseClock } from '@/composables/useCoarseClock'
import { usePollWhileInPlay } from '@/composables/usePollWhileInPlay'
import { playerInitials, resultText } from '@/lib/matchResult'
import { formatTeeTime } from '@/lib/teeTime'
import { holeOpen } from '@/lib/scoringWindow'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import ScoreBar from '@/components/tournament/ScoreBar.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import MatchScorecard from '@/components/tournament/MatchScorecard.vue'
import BaseMenu from '@/components/base/BaseMenu.vue'
import MoreIcon from '@/components/icons/MoreIcon.vue'
import { SCOPE_SCORES_WRITE, SCOPE_TOURNAMENTS_WRITE } from '@/api/scopes'

const props = defineProps<{ tournamentId: string; matchId: string }>()

const auth = useAuthStore()

// The cup, not this match: the ScoreBar pinned at the top carries every match, so an afternoon
// pairing opened during the morning session would sit on a frozen standing.
const now = useCoarseClock()
const poll = usePollWhileInPlay(now)
const { error, loading, retry, teams, results, holeStates, holes, match, left, right } = useMatchContext(
  () => props.tournamentId,
  () => props.matchId,
  {
    intervalMs: poll.intervalMs,
    parOptional: true,
  },
)
const holeInfo = computed(() => new Map(holes.value.map((h) => [h.number, h])))
const leftTeam = computed(() => teams.value.find((t) => t.id === left.value?.team_id) ?? null)
const rightTeam = computed(() => teams.value.find((t) => t.id === right.value?.team_id) ?? null)
// A row leading nowhere invites a spectator off the card that shows more than the page behind
// it. Clock-driven: the window opens with time, not with anything in the data.
poll.follow(() => results.value)

// Not gated on hole_results: it counts only holes both sides scored, so a match scored on one
// side alone has a stored result and no hole results — the state that most needs clearing.
const canReset = computed(() => auth.hasScope(SCOPE_TOURNAMENTS_WRITE))
const menu = ref<InstanceType<typeof BaseMenu> | null>(null)

// One tap, no confirmation: this exists to clear matches scored while testing, and is not
// expected to be used during a cup. Adding one has been considered and declined.
const afterMatchWrite = useAfterMatchWrite()
const { isBusy, run } = useBusy()
const resetMatch = () =>
  run(
    'reset-match',
    async () => {
      await scorecardApi.resetMatch(props.matchId)
      menu.value?.close()
      // Refetched here rather than left stale: the hole a reader taps next serves what it
      // holds before revalidating, and would re-open the scores this just cleared.
      await afterMatchWrite(props.tournamentId, props.matchId)
      toast.success('Match reset')
    },
    { error: "Couldn't reset the match. Please try again." },
  )

const openHoles = computed(() => {
  if (!auth.hasScope(SCOPE_SCORES_WRITE) || !match.value) return new Set<number>()
  const state = { finished: match.value.finished, scoredHoles: holeStates.value.map((h) => h.hole_number) }
  // Over the eighteen the card draws, not the tee set: par is optional here, and a match
  // whose tee set failed to load still has every hole on the card and every one recordable.
  return new Set(Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => holeOpen(match.value, n, state, now.value)))
})
const leftLabel = computed(() => (left.value ? playerInitials(left.value.players) : ''))
const rightLabel = computed(() => (right.value ? playerInitials(right.value.players) : ''))
</script>
<template>
  <!-- No image hero: a photo stacked under the ScoreBar pushed the card off a phone screen. -->
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
        <!-- Hand-built: an 18-hole card is a shape nothing else has, and SkeletonList would reserve the
             wrong height on the one page where the card is the whole point. -->
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
        <!-- States the result at a fixed position. The Match column's last filled cell moves as the
             round goes on, and Tot means scrolling. -->
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
          :scores-per-player="match.scores_per_player"
          :result-label="match.finished ? resultText(match) : undefined"
          :tournament-id="tournamentId"
          :match-id="matchId"
          :left-players="left?.players"
          :right-players="right?.players"
          :open-holes="openHoles"
        >
          <!-- In the letterhead beside the format, where the card names itself — an occasional
               action, out of the way of every hole row below it. -->
          <template v-if="canReset" #actions>
            <BaseMenu ref="menu" label="Match actions">
              <template #trigger><MoreIcon /></template>
              <button
                type="button"
                class="flex min-h-[44px] w-full items-center px-4 py-2 text-left text-white hover:bg-mrc-accent/25 disabled:text-white/40"
                :disabled="isBusy('reset-match')"
                @click="resetMatch"
              >
                {{ isBusy('reset-match') ? 'Resetting…' : 'Reset Match' }}
              </button>
            </BaseMenu>
          </template>
        </MatchScorecard>
      </template>
      <!-- Has no lineup yet: say so rather than a misleading "not found", since it becomes the real
           scorecard once one is set. -->
      <div v-else-if="match" class="mx-auto mt-6 max-w-2xl text-center">
        <p class="text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          · {{ formatTeeTime(match.tee_time) }}
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>
        <p class="mt-6 text-mrc-muted">The lineup for this match hasn't been set yet.</p>
        <!-- Gated on the scope the lineup page itself requires, or it offers a scorer a link that
             bounces them back. -->
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
