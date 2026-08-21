<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useCountdown } from '@/composables/useCountdown'
import { useTeamPair } from '@/composables/useTeamPair'
import { pointsText } from '@/lib/points'
import { currentSession, groupIntoSessions } from '@/lib/sessions'
import { tournamentEyebrow } from '@/lib/tournament'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonSectionCard from '@/components/skeleton/SkeletonSectionCard.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import SectionCard from '@/components/layout/SectionCard.vue'
import OrderOfPlay from '@/components/tournament/OrderOfPlay.vue'
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
    if (tournament) {
      const [t, r] = await Promise.all([scorecardApi.getTournamentTeams(tournament.id), scorecardApi.getTournamentResults(tournament.id)])
      teams = t
      results = r
    }
    return { tournament, teams, results }
  },
  { intervalMs: 20000 },
)

const tournament = computed(() => data.value?.tournament ?? null)
const teams = computed(() => data.value?.teams ?? [])
const results = computed(() => data.value?.results ?? [])
const { left, right, leftColors, rightColors } = useTeamPair(teams)

// The hero fills in as data lands: the site name until there is a tournament, then the
// captains' matchup once both are named. `?captains=false` forces the earlier state for
// previewing against the (fully-populated) demo.
const showMatchup = computed(() => {
  if (route.query.captains === 'false') return false
  return !!(left.value?.captain && right.value?.captain)
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

// The landing page shows the session being played or the next to tee off, and links to the
// rest. It used to print the whole order of play, which before the event is mostly rows
// carrying a time and nothing else, because the lineups are not set yet.
// `?session=N` steps to a later one, matching the other overrides here — a demo whose
// earliest session is a stray single match cannot show what a real slate looks like.
const session = computed(() => {
  const skip = Number(route.query.session)
  if (typeof route.query.session === 'string' && Number.isFinite(skip)) {
    return groupIntoSessions(results.value)[skip] ?? null
  }
  return currentSession(results.value)
})
const sessionTitle = computed(() => (phase.value === 'live' ? 'On the course' : 'Next out'))
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
        <div v-if="loading" data-testid="hero-skeleton">
          <SkeletonBlock tone="inverse" class="mx-auto h-3 w-32" />
          <SkeletonBlock tone="inverse" radius="md" class="mx-auto mt-6 h-9 w-3/4 md:h-11" />
          <div class="mt-8 flex items-start justify-center gap-5 sm:gap-7">
            <SkeletonBlock v-for="n in 3" :key="n" tone="inverse" radius="md" class="h-14 w-16 md:h-16 md:w-20" />
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

          <!-- Live / finished: the standing, and only the standing. It used to carry a
               button to the scores, from when the navigation was behind a hamburger; the
               tab bar resolves to that same page now, and the session card below reaches a
               particular match rather than the list. No other hero in the app asks you to
               go anywhere. -->
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
          </template>

          <!-- No tournament to describe — a failed load lands here too, and the body below
               carries the error and the retry. -->
          <h1 v-else>Manitoba Ryder Cup</h1>
        </template>
      </div>
    </section>

    <ContentContainer>
      <div class="space-y-8 py-6">
        <!-- Gated on loaded data: the session card is inferred from absence, so an
             unloaded page looks exactly like a cup with nothing left to play and would
             quietly drop the one thing this page is for. -->
        <AsyncState :loading="loading" :error="error" :retry="retry">
          <template #loading>
            <SkeletonSectionCard data-testid="body-skeleton" />
          </template>

          <!-- The one thing worth reading in full: what is being played, or what is next. -->
          <SectionCard v-if="session" :title="sessionTitle">
            <OrderOfPlay flat :matches="session.matches" :teams="teams" :tournament-id="tournament?.id ?? ''" />
          </SectionCard>
        </AsyncState>
      </div>
    </ContentContainer>
  </div>
</template>
