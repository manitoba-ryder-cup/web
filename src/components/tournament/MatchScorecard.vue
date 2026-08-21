<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Hole, HoleStatus, MatchPlayer, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import type { HoleRow, ScorecardView } from './scorecard'
import ScorecardRow from './ScorecardRow.vue'
import ScorecardSummaryRow from './ScorecardSummaryRow.vue'
import BaseSegmented from '@/components/base/BaseSegmented.vue'

// A vertical scorecard (holes down the rows, à la the real Southwood card): teams sit
// once in the header (as initials to save space), then every row is scores. Yardage
// leads (col 2), the running match state sits between the teams and par, and the hole/par
// columns are dark bands (the Southwood look). OUT/IN/TOT give the nine + total subtotals.
const props = defineProps<{
  holeStates: HoleStatus[] // per-hole match state; holeInfo carries the tee set's par

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
  // Whether a hole taps through to its entry page. False before the cup is played, when
  // that page would only turn you straight back.
  tappable?: boolean
  // A fourball's two players a side. Given, the card offers their individual scores in
  // place of the side's best ball; a format that records one score a side gives nothing
  // and the card stays as it is.
  leftPlayers?: MatchPlayer[]
  rightPlayers?: MatchPlayer[]
}>()

const router = useRouter()
const byHole = computed(() => new Map(props.holeStates.map((h) => [h.hole_number, h])))
const leftMeta = computed(() => teamColor(props.leftTeam.color))
const rightMeta = computed(() => teamColor(props.rightTeam.color))

// The two score columns, as the chosen view defines them. Both columns belong to one side
// in a side view, so both are painted in that side's colour and the header names a player
// rather than a pairing.
const VIEWS: ScorecardView[] = ['left', 'match', 'right']
const view = ref<ScorecardView>('match')
// Left, match, right — the order the card itself is in, so the control's geometry matches
// the columns it drives.
const viewIndex = computed({
  get: () => VIEWS.indexOf(view.value),
  set: (i: number) => (view.value = VIEWS[i] ?? 'match'),
})
const viewLabels = computed(() => [props.leftLabel, 'Match', props.rightLabel])
const sideOf = (v: ScorecardView) => (v === 'right' ? props.rightTeam : props.leftTeam)
const playersOf = (v: ScorecardView) => (v === 'right' ? props.rightPlayers : props.leftPlayers) ?? []
const canSplit = computed(() => (props.leftPlayers?.length ?? 0) > 1 && (props.rightPlayers?.length ?? 0) > 1)
const columnMeta = computed(() => {
  if (view.value === 'match') return [leftMeta.value, rightMeta.value] as const
  const m = teamColor(sideOf(view.value).color)
  return [m, m] as const
})
const columnLabels = computed(() => {
  if (view.value === 'match') return [props.leftLabel, props.rightLabel]
  return playersOf(view.value).map((p) => `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase())
})

function makeHole(n: number): HoleRow {
  const s = byHole.value.get(n)
  const info = props.holeInfo?.get(n)
  const scored = (team: TournamentTeam) => s?.team_scores.find((t) => t.team_id === team.id) ?? null
  let left: number | null
  let right: number | null
  let leftWon: boolean
  let rightWon: boolean
  if (view.value === 'match') {
    left = scored(props.leftTeam)?.strokes ?? null
    right = scored(props.rightTeam)?.strokes ?? null
    leftWon = left != null && right != null && left < right
    rightWon = left != null && right != null && right < left
  } else {
    // One side's two players. The mark still means the hole was won — the same thing it
    // means between sides — and within a won hole it falls on the score that took it. A
    // low score in a hole the side halved or lost took nothing, so it is left plain.
    const team = sideOf(view.value)
    const other = view.value === 'right' ? props.leftTeam : props.rightTeam
    const held = scored(team)
    const opponent = scored(other)
    const strokesFor = (p: MatchPlayer | undefined) =>
      p ? (held?.player_scores.find((ps) => ps.player_id === p.player_id)?.strokes ?? null) : null
    const [a, b] = playersOf(view.value)
    left = strokesFor(a)
    right = strokesFor(b)
    const best = held?.strokes ?? null
    const wonHole = best != null && opponent?.strokes != null && best < opponent.strokes
    leftWon = wonHole && left === best
    rightWon = wonHole && right === best
  }
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
    leftWon,
    rightWon,
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
  const states = [...front.value, ...back.value].map((r) => r.state).filter((s): s is { text: string; cls: string } => s !== null)
  return states.length ? states[states.length - 1].cls : 'text-mrc-ink'
})

function open(hole: number) {
  router.push({ name: 'hole', params: { tournamentId: props.tournamentId, matchId: props.matchId, hole } })
}
</script>
<template>
  <div>
    <div class="mx-auto max-w-2xl overflow-hidden rounded-sm border border-mrc-line">
      <table class="w-full table-fixed text-center text-base tabular-nums">
        <!-- Masthead, built like a printed card's letterhead: where and what kind, pinned to
           the two edges as a header rule. The pairing is the caller's heading, above the
           card. A <caption> keeps this part of the table rather than a strip that happens
           to sit above one. Charcoal here, mrc-muted for the structural bands (header row,
           Hole and Par columns), panel-alt for the totals. -->
        <caption v-if="courseName || formatName" class="bg-mrc-charcoal px-3 py-3">
          <div class="flex items-baseline justify-between gap-3 font-semibold text-white/90">
            <span class="min-w-0 truncate text-left">{{ courseName }}</span>
            <span class="shrink-0 text-right">{{ formatName }}</span>
          </div>
        </caption>
        <thead>
          <tr class="divide-x divide-mrc-line bg-mrc-muted text-white">
            <th class="w-10 py-2.5 text-sm font-semibold uppercase tracking-wide">Hole</th>
            <th class="w-11 py-2.5 text-sm font-semibold uppercase tracking-wide">Yds</th>
            <th v-for="(label, i) in columnLabels" :key="i" class="w-14 py-2.5">
              <span class="mx-auto flex max-w-full items-center justify-center gap-1">
                <span class="inline-block h-2 w-2 shrink-0 rounded-full" :style="{ background: columnMeta[i].cssVar }" />
                <span class="truncate text-sm font-semibold">{{ label }}</span>
              </span>
            </th>
            <th class="w-16 py-2.5 text-sm font-semibold uppercase tracking-wide">Match</th>
            <th class="w-9 py-2.5 text-sm font-semibold uppercase tracking-wide">Par</th>
            <th class="w-9 py-2.5 text-sm font-semibold uppercase tracking-wide">Hcp</th>
          </tr>
        </thead>
        <tbody>
          <ScorecardRow
            v-for="r in front"
            :key="r.hole"
            :row="r"
            :left-meta="columnMeta[0]"
            :right-meta="columnMeta[1]"
            :tappable="tappable !== false"
            @open="open"
          />
          <ScorecardSummaryRow label="Out" :yards="out.yards" :left="out.left" :right="out.right" :par="out.par" />
          <ScorecardRow
            v-for="r in back"
            :key="r.hole"
            :row="r"
            :left-meta="columnMeta[0]"
            :right-meta="columnMeta[1]"
            :tappable="tappable !== false"
            @open="open"
          />
          <ScorecardSummaryRow label="In" :yards="inc.yards" :left="inc.left" :right="inc.right" :par="inc.par" />
          <ScorecardSummaryRow
            label="Tot"
            total
            :yards="tot.yards"
            :left="tot.left"
            :right="tot.right"
            :par="tot.par"
            :result="resultLabel"
            :result-cls="resultCls"
          />
        </tbody>
      </table>
    </div>
    <!-- Under the card, not in it: a control is not tabular data, and a row of it inside the
       table would be read as one. Here it also sits against the OUT/IN/TOT band, so
       switching to a player changes their totals right where the tap was. -->
    <!-- Further off the card than the summary row above it sits: that gap separates two
         pieces of content, this one separates the card from a control acting on it, and
         the TOT row's heavy rule makes the bottom edge the stronger of the two. -->
    <div v-if="canSplit" class="mx-auto mt-6 max-w-2xl">
      <BaseSegmented v-model="viewIndex" :options="viewLabels" label="Whose scores" />
    </div>
  </div>
</template>
