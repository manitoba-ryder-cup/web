<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { TournamentPhase } from '@/api/types'
import { q } from '@/api/queries'
import { combine, useResource } from '@/composables/useAsync'
import { useCoarseClock } from '@/composables/useCoarseClock'
import { usePollWhileInPlay } from '@/composables/usePollWhileInPlay'
import { useCurrentCup } from '@/composables/useCurrentCup'
import { useCountdown } from '@/composables/useCountdown'
import { useTeamPair } from '@/composables/useTeamPair'
import { pointsText } from '@/lib/points'
import { groupIntoSessions, headlineSession, sessionUnderWay } from '@/lib/sessions'
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
const cup = useCurrentCup()

// The card and its heading turn on the tee time alone, so a page left open across it has
// nothing else to recompute from.
const now = useCoarseClock()
// Not zero when the cup is idle: an unpublished schedule reads as not in play, and only a
// request turns that empty list full — a page open on the morning of would never see it.
const poll = usePollWhileInPlay(now)
const enabled = () => cup.known()
// All three move while a cup is on: the record carries the phase, the teams carry the points
// the hero renders as the score, and the results carry the matches under way.
const polled = { enabled, intervalMs: poll.intervalMs }
const tournamentRes = useResource(() => q.tournament(cup.id()), polled)
const teamsRes = useResource(() => q.teams(cup.id()), polled)
const resultsRes = useResource(() => q.results(cup.id()), polled)
const { error, loading, retry } = combine([cup, tournamentRes, teamsRes, resultsRes])

const tournament = computed(() => tournamentRes.data.value ?? null)
const teams = computed(() => teamsRes.data.value ?? [])
const results = computed(() => resultsRes.data.value ?? [])
poll.follow(() => results.value)
const { left, right, leftColors, rightColors } = useTeamPair(teams)

// The states the demo data cannot reach: it is all in the past, and the captains are set.
// `import.meta.env.DEV` is a literal at build time, so none of this survives into the site.
function preview(key: string): string | undefined {
  if (!import.meta.env.DEV) return undefined
  const value = route.query[key]
  return typeof value === 'string' ? value : undefined
}

// `?captains=false` forces the earlier state for previewing against the populated demo.
const showMatchup = computed(() => {
  if (preview('captains') === 'false') return false
  return !!(left.value?.captain && right.value?.captain)
})
// The phase is the record's: deriving it here called a match started later than the API does.
// The default covers the moment before the record loads, not an API that omits the field.
const phase = computed<TournamentPhase>(() => {
  const override = preview('phase')
  if (override === 'upcoming' || override === 'live' || override === 'finished') return override
  return tournament.value?.phase ?? 'upcoming'
})

const heroEyebrow = computed(() => tournamentEyebrow(tournament.value))
// Captured once so the `?days=` preview target stays fixed as the clock advances.
const previewBase = Date.now()

// The moment the event tees off: the earliest scheduled match, falling back to the start
// date. `?days=` overrides it for previewing (demo tournaments are all in the past).
const teeOffAt = computed<number | null>(() => {
  const days = Number(preview('days'))
  if (Number.isFinite(days)) return previewBase + days * 86_400_000
  const times = results.value.map((m) => new Date(m.tee_time).getTime())
  if (times.length) return Math.min(...times)
  // No schedule yet: aim at the start date read as a local midnight, matching formatDate —
  // as UTC it lands in the evening of the day before for anyone west of Greenwich.
  const iso = tournament.value?.start_date
  return iso ? new Date(`${iso}T00:00:00`).getTime() : null
})

const { segments } = useCountdown(teeOffAt)

// One session, not the whole order. `?session=N` steps to a later one for a demo.
const session = computed(() => {
  const skip = Number(preview('session'))
  if (Number.isFinite(skip)) return groupIntoSessions(results.value)[skip] ?? null
  return headlineSession(results.value, now.value)
})
// Follows the session rather than the cup, which is live across a whole day. The record is
// consulted only at the end, where a match nobody closed out would read as on the course for good.
const sessionTitle = computed(() => {
  const s = session.value
  if (phase.value === 'finished' || s?.matches.every((m) => m.finished)) return 'Just played'
  return sessionUnderWay(s, now.value) ? 'On the course' : 'Next out'
})
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
        <!-- Placeholders sized like the centrepiece, and phase-agnostic: a wide bar over a row of three
             reads as either the countdown or the score, which is all we can promise before data lands. -->
        <div v-if="loading" data-testid="hero-skeleton">
          <SkeletonBlock tone="inverse" class="mx-auto h-3 w-32" />
          <SkeletonBlock tone="inverse" radius="md" class="mx-auto mt-6 h-9 w-3/4 md:h-11" />
          <div class="mt-8 flex items-start justify-center gap-5 sm:gap-7">
            <SkeletonBlock v-for="n in 3" :key="n" tone="inverse" radius="md" class="h-14 w-16 md:h-16 md:w-20" />
          </div>
        </div>

        <template v-else>
          <CapsLabel v-if="heroEyebrow" size="sm" class="text-white/80">{{ heroEyebrow }}</CapsLabel>

          <!-- Counting down: the matchup and the clock, not a 0-0 score. The standing takes over
               when the clock runs out, not when the record turns live — that is a hole's play later. -->
          <template v-if="phase === 'upcoming' && segments && tournament">
            <CaptainMatchup v-if="showMatchup" :teams="teams" size="lg" class="mt-5" />
            <h1 v-else class="mt-4 md:text-5xl">{{ tournament.name }}</h1>
            <div class="mt-7">
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
          </template>

          <!-- No tournament to describe — a failed load lands here too, and the body below
               carries the error and the retry. -->
          <h1 v-else>Manitoba Ryder Cup</h1>
        </template>
      </div>
    </section>

    <ContentContainer>
      <div class="space-y-8 py-6">
        <!-- Gated on loaded data: inferred from absence, so an unloaded page looks exactly like a cup
             with nothing left to play. -->
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
