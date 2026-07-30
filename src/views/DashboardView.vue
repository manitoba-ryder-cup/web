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
import AsyncState from '@/components/base/AsyncState.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import SectionCard from '@/components/layout/SectionCard.vue'
import OrderOfPlay from '@/components/tournament/OrderOfPlay.vue'
import Rosters from '@/components/tournament/Rosters.vue'
import PlayerField from '@/components/tournament/PlayerField.vue'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'

const route = useRoute()

// The landing adapts to the event's phase: before it (the draft + schedule), during it
// (the live standing), and after (the final standing). Polls live.
const { data, error, loading, retry } = useAsync(
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
        <!-- Loading: placeholders sized like the centrepiece, not a spinner — the hero is
             what the page is, and it shouldn't collapse and then shove itself back open.
             Deliberately phase-agnostic: a wide bar over a row of three reads as either the
             countdown or the score, which is all we can honestly promise before data lands. -->
        <div v-if="loading" class="animate-pulse" data-testid="hero-skeleton">
          <!-- Frosted, and one alpha for every block. Translucent white alone can't work
               here: the crowd photo swings from bright fairway to dark stands, so any alpha
               that shows over the grass screams over the stands, and the wide bar spans both
               — its own tone shifting across its width. The blur flattens what's behind into
               a single tone, so the blocks read as panels instead of haze on the image. -->
          <div class="mx-auto h-3 w-32 rounded bg-white/30 backdrop-blur-md" />
          <div class="mx-auto mt-6 h-9 w-3/4 rounded-md bg-white/30 backdrop-blur-md md:h-11" />
          <div class="mt-8 flex items-start justify-center gap-5 sm:gap-7">
            <div v-for="n in 3" :key="n" class="h-14 w-16 rounded-md bg-white/30 backdrop-blur-md md:h-16 md:w-20" />
          </div>
        </div>

        <template v-else>
          <CapsLabel v-if="heroEyebrow" size="sm" class="text-white/80">{{ heroEyebrow }}</CapsLabel>

          <!-- Upcoming: the matchup (once captains are set) + countdown, not a 0–0 score. -->
          <template v-if="phase === 'upcoming' && tournament">
            <CaptainMatchup v-if="showMatchup" :teams="teams" size="lg" class="mt-5" />
            <h1 v-else class="mt-4 md:text-5xl">{{ tournament.name }}</h1>
            <div v-if="segments" class="mt-7">
              <CapsLabel class="mb-3 text-white/60">Tees off in</CapsLabel>
              <div class="flex items-start justify-center gap-5 tabular-nums sm:gap-7">
                <div v-for="seg in segments" :key="seg.label" class="flex flex-col items-center">
                  <span class="font-body text-5xl font-bold leading-none md:text-6xl">{{ seg.text }}</span>
                  <CapsLabel class="mt-1.5 text-white/60">{{ seg.label }}</CapsLabel>
                </div>
              </div>
            </div>
          </template>

          <!-- Live / finished: the standing. -->
          <template v-else-if="left && right">
            <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-x-3">
              <p class="truncate font-display text-xl font-bold uppercase tracking-wide">
                {{ left.captain?.last_name }}
              </p>
              <span />
              <p class="truncate font-display text-xl font-bold uppercase tracking-wide">
                {{ right.captain?.last_name }}
              </p>
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

          <!-- No tournament to describe — a failed load lands here too, and the body below
               carries the error and the retry. -->
          <h1 v-else>Manitoba Ryder Cup</h1>
        </template>
      </div>
    </section>

    <ContentContainer>
      <div class="space-y-8 py-6">
        <!-- Everything below the hero is gated on loaded data, because the pre-event states
             are all inferred from absence: an unloaded page looks exactly like an
             un-drafted one, and would claim the teams are still to be announced. -->
        <AsyncState :loading="loading" :error="error" :retry="retry">
          <template #loading>
            <!-- Shaped like the section card that's about to replace it, and borrowing its
                 real header band rather than a light grey stand-in: the band is certain to
                 be there and certain to be dark, so faking it pale only buys a lurch when
                 the card lands. Only the genuinely unknown parts pulse. -->
            <div class="overflow-hidden rounded-md border border-mrc-line bg-white" data-testid="body-skeleton">
              <div class="bg-mrc-muted py-2.5">
                <div class="flex h-6 items-center justify-center">
                  <div class="h-3.5 w-32 animate-pulse rounded bg-white/40" />
                </div>
              </div>
              <div class="animate-pulse space-y-3 p-4">
                <div v-for="n in 4" :key="n" class="h-4 rounded bg-mrc-line" />
              </div>
            </div>
          </template>

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
            <CapsLabel v-if="tbdNote" size="sm" class="py-2 text-center text-mrc-muted">{{ tbdNote }}</CapsLabel>
          </template>

          <!-- Live / finished: the order of play. -->
          <SectionCard v-else-if="results.length" title="Order of Play">
            <OrderOfPlay flat :matches="results" :teams="teams" :tournament-id="tournament?.id ?? ''" />
          </SectionCard>
        </AsyncState>
      </div>
    </ContentContainer>
  </div>
</template>
