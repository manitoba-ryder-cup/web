<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Hole, HoleStatus, MatchPlayer, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import { playerInitials } from '@/lib/matchResult'
import type { HoleRow, ScorecardView } from './scorecard'
import ScorecardRow from './ScorecardRow.vue'
import ScorecardSummaryRow from './ScorecardSummaryRow.vue'
import BaseSegmented from '@/components/base/BaseSegmented.vue'

// Vertical, like the real Southwood card: holes down the rows, teams once in the header as
// initials to save the width.
const props = defineProps<{
  holeStates: HoleStatus[] // per-hole match state; holeInfo carries the tee set's par

  leftTeam: TournamentTeam
  rightTeam: TournamentTeam
  leftLabel: string
  rightLabel: string
  courseName?: string
  formatName?: string
  scoresPerPlayer?: boolean
  resultLabel?: string
  holeInfo?: Map<number, Hole>
  tournamentId: string
  matchId: string
  // Per hole, not per card: a decided match still takes corrections to the holes it was
  // played over. Omitted, nothing taps.
  openHoles?: Set<number>
  // A fourball's two players a side; without them the card stays on the best ball.
  leftPlayers?: MatchPlayer[]
  rightPlayers?: MatchPlayer[]
}>()

const router = useRouter()
const byHole = computed(() => new Map(props.holeStates.map((h) => [h.hole_number, h])))
const leftMeta = computed(() => teamColor(props.leftTeam.color))
const rightMeta = computed(() => teamColor(props.rightTeam.color))

// Left, match, right — the order the card is in, so the control matches the columns.
const VIEWS: ScorecardView[] = ['left', 'match', 'right']
const view = ref<ScorecardView>('match')
const viewIndex = computed({
  get: () => VIEWS.indexOf(view.value),
  set: (i: number) => (view.value = VIEWS[i] ?? 'match'),
})
const viewLabels = computed(() => [props.leftLabel, 'Match', props.rightLabel])
const sideOf = (v: ScorecardView) => (v === 'right' ? props.rightTeam : props.leftTeam)
const playersOf = (v: ScorecardView) => (v === 'right' ? props.rightPlayers : props.leftPlayers) ?? []
// Not "has two players": Alt Shot and Scotch field two and record one ball, so a split
// column would be eighteen dashes.
const canSplit = computed(() => !!props.scoresPerPlayer && props.leftPlayers?.length === 2 && props.rightPlayers?.length === 2)
// Label and colour together, so the header cannot outrun its colours.
const columns = computed(() => {
  if (view.value === 'match') {
    return [
      { label: props.leftLabel, meta: leftMeta.value },
      { label: props.rightLabel, meta: rightMeta.value },
    ]
  }
  const meta = teamColor(sideOf(view.value).color)
  return playersOf(view.value).map((p) => ({ label: playerInitials([p]), meta }))
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
    // The mark still means the hole was won, so a low score in one the side halved or
    // lost took nothing and stays plain.
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

const route = useRoute()
// Recorded once honoured, so a hash is answered once: `front` is a new array on every
// evaluation, and without this each later change drags a reader who has scrolled away back.
const scrolledTo = ref('')
// Saving a hole comes back here, and on a phone the card runs past the fold at about the
// tenth — so the hole just written has to be brought to where it can be read.
watch(
  [() => route.hash, front],
  async () => {
    const hole = route.hash.match(/^#hole-(\d+)$/)?.[1]
    if (!hole) {
      scrolledTo.value = ''
      return
    }
    if (scrolledTo.value === hole) return
    await nextTick()
    const row = document.getElementById(`hole-${hole}`)
    if (!row) return
    scrolledTo.value = hole
    row.scrollIntoView({ block: 'center' })
  },
  { immediate: true },
)
</script>
<template>
  <div>
    <div class="mx-auto max-w-2xl overflow-hidden rounded-sm border border-mrc-line">
      <table class="w-full table-fixed text-center text-base tabular-nums">
        <!-- A <caption> keeps this part of the table rather than a strip that happens to sit above
             one. Charcoal here, mrc-muted for the structural bands, panel-alt for the totals. -->
        <caption v-if="courseName || formatName" class="bg-mrc-charcoal px-3 py-3">
          <div class="flex items-center justify-between gap-3 font-semibold text-white/90">
            <span class="min-w-0 truncate text-left">{{ courseName }}</span>
            <span class="ml-auto shrink-0 text-right">{{ formatName }}</span>
            <!-- Actions belong to whoever renders the card; it does not know what they are.
                 The -mr-3 pulls the menu's own tap padding back to the letterhead's edge. -->
            <span class="-my-3 -mr-3 shrink-0"><slot name="actions" /></span>
          </div>
        </caption>
        <thead>
          <tr class="divide-x divide-mrc-line bg-mrc-muted text-white">
            <th class="w-10 py-2.5 text-sm font-semibold uppercase tracking-wide">Hole</th>
            <th class="w-11 py-2.5 text-sm font-semibold uppercase tracking-wide">Yds</th>
            <th v-for="(col, i) in columns" :key="i" class="w-14 py-2.5">
              <span class="mx-auto flex max-w-full items-center justify-center gap-1">
                <span class="inline-block h-2 w-2 shrink-0 rounded-full" :style="{ background: col.meta.cssVar }" />
                <span class="truncate text-sm font-semibold">{{ col.label }}</span>
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
            :left-meta="columns[0].meta"
            :right-meta="columns[1].meta"
            :tappable="openHoles?.has(r.hole) ?? false"
            @open="open"
          />
          <ScorecardSummaryRow label="Out" :yards="out.yards" :left="out.left" :right="out.right" :par="out.par" />
          <ScorecardRow
            v-for="r in back"
            :key="r.hole"
            :row="r"
            :left-meta="columns[0].meta"
            :right-meta="columns[1].meta"
            :tappable="openHoles?.has(r.hole) ?? false"
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
    <!-- Under the card, not in it: a control is not tabular data, and a row of it inside the table
         would be read as one. -->
    <!-- Wider than the gap above it: that separates two pieces of content, this separates the card
         from a control acting on it. -->
    <div v-if="canSplit" class="mx-auto mt-6 max-w-2xl">
      <BaseSegmented v-model="viewIndex" :options="viewLabels" label="Whose scores" />
    </div>
  </div>
</template>
