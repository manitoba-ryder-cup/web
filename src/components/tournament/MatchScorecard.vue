<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Hole, HoleStatus, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import type { HoleRow } from './scorecard'
import ScorecardRow from './ScorecardRow.vue'
import ScorecardSummaryRow from './ScorecardSummaryRow.vue'

// A vertical scorecard (holes down the rows, à la the real Southwood card): teams sit
// once in the header (as initials to save space), then every row is scores. Yardage
// leads (col 2), the running match state sits between the teams and par, and the hole/par
// columns are dark bands (the Southwood look). OUT/IN/TOT give the nine + total subtotals.
const props = defineProps<{
  holes: HoleStatus[]
  leftTeam: TournamentTeam
  rightTeam: TournamentTeam
  leftLabel: string
  rightLabel: string
  courseName?: string
  formatName?: string
  resultLabel?: string
  holeInfo?: Map<number, Hole>
  tournamentId: string
  matchId: string
}>()

const router = useRouter()
const byHole = computed(() => new Map(props.holes.map((h) => [h.hole_number, h])))
const leftMeta = computed(() => teamColor(props.leftTeam.color))
const rightMeta = computed(() => teamColor(props.rightTeam.color))

function makeHole(n: number): HoleRow {
  const s = byHole.value.get(n)
  const info = props.holeInfo?.get(n)
  const left = s?.team_scores.find((t) => t.team_id === props.leftTeam.id)?.strokes ?? null
  const right = s?.team_scores.find((t) => t.team_id === props.rightTeam.id)?.strokes ?? null
  let state: HoleRow['state'] = null
  if (s) {
    if (!s.leader_team_id) state = { text: 'AS', cls: 'text-mrc-muted' }
    else {
      const leader = s.leader_team_id === props.leftTeam.id ? leftMeta.value : rightMeta.value
      state = { text: `${s.lead} UP`, cls: leader.text }
    }
  }
  return {
    hole: n,
    left,
    right,
    leftWon: left != null && right != null && left < right,
    rightWon: left != null && right != null && right < left,
    par: info?.par ?? null,
    hdcp: info?.hdcp ?? null,
    yards: info?.yards ?? null,
    state,
  }
}
const front = computed(() => Array.from({ length: 9 }, (_, i) => makeHole(i + 1)))
const back = computed(() => Array.from({ length: 9 }, (_, i) => makeHole(i + 10)))

function sum(rows: HoleRow[], pick: (r: HoleRow) => number | null): number | null {
  const vals = rows.map(pick).filter((v): v is number => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null
}
function add(a: number | null, b: number | null): number | null {
  return a != null || b != null ? (a ?? 0) + (b ?? 0) : null
}
const out = computed(() => ({
  yards: sum(front.value, (r) => r.yards),
  left: sum(front.value, (r) => r.left),
  right: sum(front.value, (r) => r.right),
  par: sum(front.value, (r) => r.par),
}))
const inc = computed(() => ({
  yards: sum(back.value, (r) => r.yards),
  left: sum(back.value, (r) => r.left),
  right: sum(back.value, (r) => r.right),
  par: sum(back.value, (r) => r.par),
}))
const tot = computed(() => ({
  yards: add(out.value.yards, inc.value.yards),
  left: add(out.value.left, inc.value.left),
  right: add(out.value.right, inc.value.right),
  par: add(out.value.par, inc.value.par),
}))

// Colour the total-row result like the running state: the final leader's colour.
const resultCls = computed(() => {
  const states = [...front.value, ...back.value]
    .map((r) => r.state)
    .filter((s): s is { text: string; cls: string } => s !== null)
  return states.length ? states[states.length - 1].cls : 'text-mrc-ink'
})

function open(hole: number) {
  router.push({ name: 'hole', params: { tournamentId: props.tournamentId, matchId: props.matchId, hole } })
}
</script>
<template>
  <div class="mx-auto max-w-2xl overflow-hidden rounded-sm border border-mrc-line">
    <table class="w-full table-fixed text-center text-base tabular-nums">
      <!-- Masthead, built like a printed card's letterhead: where and what kind, pinned to
           the two edges as a header rule. The pairing is the caller's heading, above the
           card. A <caption> keeps this part of the table rather than a strip that happens
           to sit above one. Charcoal here, mrc-muted for the structural bands (header row,
           Hole and Par columns), panel-alt for the totals. -->
      <caption v-if="courseName || formatName" class="bg-mrc-charcoal px-3 py-2.5">
        <div class="flex items-baseline justify-between gap-3 text-xs font-semibold uppercase tracking-widest text-white/70">
          <span class="min-w-0 truncate text-left">{{ courseName }}</span>
          <span class="shrink-0 text-right">{{ formatName }}</span>
        </div>
      </caption>
      <thead>
        <tr class="divide-x divide-mrc-line bg-mrc-muted text-white">
          <th class="w-10 py-2.5 text-sm font-semibold uppercase tracking-wide">Hole</th>
          <th class="w-11 py-2.5 text-sm font-semibold uppercase tracking-wide">Yds</th>
          <th class="w-14 py-2.5">
            <span class="mx-auto flex max-w-full items-center justify-center gap-1">
              <span class="inline-block h-2 w-2 shrink-0 rounded-full" :style="{ background: leftMeta.cssVar }" />
              <span class="truncate text-sm font-semibold">{{ leftLabel }}</span>
            </span>
          </th>
          <th class="w-14 py-2.5">
            <span class="mx-auto flex max-w-full items-center justify-center gap-1">
              <span class="inline-block h-2 w-2 shrink-0 rounded-full" :style="{ background: rightMeta.cssVar }" />
              <span class="truncate text-sm font-semibold">{{ rightLabel }}</span>
            </span>
          </th>
          <th class="w-16 py-2.5 text-sm font-semibold uppercase tracking-wide">Match</th>
          <th class="w-9 py-2.5 text-sm font-semibold uppercase tracking-wide">Par</th>
          <th class="w-9 py-2.5 text-sm font-semibold uppercase tracking-wide">Hcp</th>
        </tr>
      </thead>
      <tbody>
        <ScorecardRow v-for="r in front" :key="r.hole" :row="r" :left-meta="leftMeta" :right-meta="rightMeta" @open="open" />
        <ScorecardSummaryRow label="Out" :yards="out.yards" :left="out.left" :right="out.right" :par="out.par" />
        <ScorecardRow v-for="r in back" :key="r.hole" :row="r" :left-meta="leftMeta" :right-meta="rightMeta" @open="open" />
        <ScorecardSummaryRow label="In" :yards="inc.yards" :left="inc.left" :right="inc.right" :par="inc.par" />
        <ScorecardSummaryRow
          label="Tot" total :yards="tot.yards" :left="tot.left" :right="tot.right" :par="tot.par"
          :result="resultLabel" :result-cls="resultCls" />
      </tbody>
    </table>
  </div>
</template>
