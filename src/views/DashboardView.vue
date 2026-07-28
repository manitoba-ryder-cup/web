<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { MatchResult, TournamentPlayer, TournamentTeam } from '@/api/types'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useCountdown } from '@/composables/useCountdown'
import { useTeamPair } from '@/composables/useTeamPair'
import { pointsText } from '@/lib/points'
import { tournamentEyebrow } from '@/lib/tournament'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import SectionCard from '@/components/layout/SectionCard.vue'
import OrderOfPlay from '@/components/tournament/OrderOfPlay.vue'
import Rosters from '@/components/tournament/Rosters.vue'
import PlayerField from '@/components/tournament/PlayerField.vue'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'

const route = useRoute()

// The landing adapts to the event's phase: before it (the draft + schedule), during it
// (the live standing), and after (the final standing). Polls live.
const { data, loading } = useAsync(
  async () => {
    const tournaments = await scorecardApi.listTournaments()
    const tournament = [...tournaments].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
    let teams: TournamentTeam[] = []
    let results: MatchResult[] = []
    let players: TournamentPlayer[] = []
    if (tournament) {
      const [t, r, p] = await Promise.all([
        scorecardApi.getTournamentTeams(tournament.id),
        scorecardApi.getTournamentResults(tournament.id),
        scorecardApi.getTournamentPlayers(tournament.id),
      ])
      teams = t
      results = r
      players = p
    }
    return { tournament, teams, results, players }
  },
  { intervalMs: 20000 },
)

const tournament = computed(() => data.value?.tournament ?? null)
const teams = computed(() => data.value?.teams ?? [])
const results = computed(() => data.value?.results ?? [])
const players = computed(() => data.value?.players ?? [])
const { left, right, leftColors, rightColors } = useTeamPair(teams)

// The pre-event page fills in progressively as data lands: field → (captains) matchup →
// (draft) team sheets → (schedule) order of play. The `?captains|drafted|schedule=false`
// overrides force the earlier states for previewing against the (fully-populated) demo.
const showMatchup = computed(() => {
  if (route.query.captains === 'false') return false
  return !!(left.value?.captain && right.value?.captain)
})
const drafted = computed(() => {
  if (route.query.drafted === 'false') return false
  // The captains are on teams from the start, so "some assigned" isn't the draft being
  // done — treat it as drafted only once every entered player has a team.
  return players.value.length > 0 && players.value.every((p) => !!p.team_id)
})
const hasSchedule = computed(() => {
  if (route.query.schedule === 'false') return false
  return results.value.length > 0
})
// What's still to come, phrased for the pre-event notice below the field.
const tbdNote = computed(() => {
  if (!drafted.value && !hasSchedule.value) return 'Teams and schedule to be announced'
  if (!drafted.value) return 'Teams to be announced'
  if (!hasSchedule.value) return 'Schedule to be announced'
  return ''
})

// Phase from the results: nothing played = upcoming (draft/schedule), all done = finished,
// otherwise live. `?phase=` overrides it for previewing a mode against real data.
const phase = computed<'upcoming' | 'live' | 'finished'>(() => {
  const override = route.query.phase
  if (override === 'upcoming' || override === 'live' || override === 'finished') return override
  const r = results.value
  if (!r.length || !r.some((m) => m.finished || m.hole_results.length > 0)) return 'upcoming'
  if (r.every((m) => m.finished)) return 'finished'
  return 'live'
})

const heroEyebrow = computed(() => tournamentEyebrow(tournament.value))
// Captured once so the `?days=` preview target stays fixed as the clock advances.
const previewBase = Date.now()

// The moment the event tees off: the earliest scheduled match, falling back to the start
// date. `?days=` overrides it for previewing (demo tournaments are all in the past).
const teeOffAt = computed<number | null>(() => {
  const override = Number(route.query.days)
  if (typeof route.query.days === 'string' && Number.isFinite(override)) {
    return previewBase + override * 86_400_000
  }
  const times = results.value.map((m) => new Date(m.tee_time).getTime())
  if (times.length) return Math.min(...times)
  // No schedule yet: aim at the start date read as a local midnight, matching formatDate —
  // as UTC it lands in the evening of the day before for anyone west of Greenwich.
  const iso = tournament.value?.start_date
  return iso ? new Date(`${iso}T00:00:00`).getTime() : null
})

const { segments } = useCountdown(teeOffAt)
</script>
<template>
  <div>
    <!-- Immersive hero: adapts to the event phase. -->
    <section
      class="relative flex min-h-[26rem] flex-col items-center justify-center overflow-hidden bg-mrc-ink px-4 py-12 text-center text-white md:min-h-[32rem]"
    >
      <img src="/img/crowd.webp" alt="" fetchpriority="high" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />
      <div class="relative w-full max-w-2xl">
        <p v-if="heroEyebrow" class="text-sm font-semibold uppercase tracking-widest text-white/80">{{ heroEyebrow }}</p>

        <!-- Upcoming: the matchup (once captains are set) + countdown, not a 0–0 score. -->
        <template v-if="phase === 'upcoming'">
          <CaptainMatchup v-if="showMatchup" :teams="teams" size="lg" class="mt-5" />
          <h1 v-else-if="tournament" class="mt-4 font-display text-4xl font-bold md:text-5xl">{{ tournament.name }}</h1>
          <div v-if="segments" class="mt-7">
            <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">Tees off in</p>
            <div class="flex items-start justify-center gap-5 tabular-nums sm:gap-7">
              <div v-for="seg in segments" :key="seg.label" class="flex flex-col items-center">
                <span class="font-body text-5xl font-bold leading-none md:text-6xl">{{ seg.text }}</span>
                <span class="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">{{ seg.label }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Live / finished: the standing. -->
        <template v-else-if="left && right">
          <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-x-3">
            <p class="truncate font-display text-xl font-bold uppercase tracking-wide">{{ left.captain?.last_name }}</p>
            <span />
            <p class="truncate font-display text-xl font-bold uppercase tracking-wide">{{ right.captain?.last_name }}</p>
            <p class="font-display text-7xl font-bold leading-none tabular-nums" :class="leftColors.softText">
              {{ pointsText(left.points) }}
            </p>
            <span class="pb-2 text-4xl font-bold text-white/50">–</span>
            <p class="font-display text-7xl font-bold leading-none tabular-nums" :class="rightColors.softText">
              {{ pointsText(right.points) }}
            </p>
          </div>
          <RouterLink
            v-if="tournament"
            :to="{ name: 'tournament', params: { id: tournament.id } }"
            class="mt-8 inline-block rounded-md bg-mrc-accent-tint px-6 py-3 font-semibold text-mrc-accent shadow-lg"
          >
            View Leaderboard
          </RouterLink>
        </template>

        <h1 v-else-if="!loading" class="font-display text-4xl font-bold">Manitoba Ryder Cup</h1>
      </div>
    </section>

    <ContentContainer>
      <div class="space-y-8 py-6">
        <!-- Pre-event: the drafted teams, or the field before the draft, then the schedule. -->
        <template v-if="phase === 'upcoming'">
          <SectionCard v-if="drafted" title="The Teams" padded>
            <Rosters :players="players" :teams="teams" />
          </SectionCard>
          <SectionCard v-else-if="players.length" title="The Field" padded>
            <PlayerField :players="players" />
          </SectionCard>
          <SectionCard v-if="hasSchedule" title="Order of Play">
            <OrderOfPlay flat :matches="results" :teams="teams" :tournament-id="tournament?.id ?? ''" />
          </SectionCard>
          <p v-if="tbdNote" class="py-2 text-center text-sm font-medium uppercase tracking-wide text-mrc-muted">{{ tbdNote }}</p>
        </template>

        <!-- Live / finished: the order of play. -->
        <SectionCard v-else-if="results.length" title="Order of Play">
          <OrderOfPlay flat :matches="results" :teams="teams" :tournament-id="tournament?.id ?? ''" />
        </SectionCard>
      </div>
    </ContentContainer>
  </div>
</template>
