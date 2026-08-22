<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { MatchResult, TournamentTeam } from '@/api/types'
import { teamColor } from '@/lib/teamColor'
import { orderSides } from '@/lib/teamOrder'
import { playerSurnames, resultText } from '@/lib/matchResult'
import { formatTeeTime as fmtTime, teeDayLabel as dayLabel, teeDayKey as dayKeyOf } from '@/lib/teeTime'

// The session header carries the day and format, so multi-day fields do not repeat it per row.
// `flat` drops the outer border for embedding in a SectionCard.
const props = defineProps<{ matches: MatchResult[]; teams: TournamentTeam[]; tournamentId: string; flat?: boolean }>()

const teamById = computed(() => new Map(props.teams.map((t) => [t.id, t])))
function teamMeta(teamId: string | null | undefined) {
  return teamColor(teamId ? teamById.value.get(teamId)?.color : null)
}
// A team-colour dot per side (consistent top/bottom across rows) shows who's on what
// team; strong/dim follows the actual result so the leader — not just the top row — pops.
interface Side {
  name: string
  dot: string
  dim: boolean
}
interface Row {
  id: string
  sides: Side[]
  time: string
  status: { text: string; cls: string } | null
}
function rowOf(m: MatchResult): Row {
  const sorted = orderSides(m.sides, props.teams)
  const played = m.hole_results.length
  // The team to emphasise: the winner (finished) or the current leader (in progress).
  let strongId: string | null = null
  let status: Row['status'] = null
  if (m.finished) {
    strongId = m.winner_team_id
    status = { text: resultText(m), cls: strongId ? teamMeta(strongId).text : 'text-mrc-muted' }
  } else if (played > 0) {
    strongId = m.leader_team_id
    status = { text: `${resultText(m)} · thru ${played}`, cls: strongId ? teamMeta(strongId).text : 'text-mrc-muted' }
  }
  const decided = strongId != null
  return {
    id: m.match_id,
    sides: sorted.map((s) => ({
      name: playerSurnames(s.players),
      dot: teamMeta(s.team_id).cssVar,
      dim: decided && s.team_id !== strongId,
    })),
    time: fmtTime(m.tee_time),
    status,
  }
}

// One session = a day + format. Matches arrive tee-time ordered; a Map keyed by day|format
// keeps each session's first-seen order, so sessions read chronologically.
interface Session {
  key: string
  day: string
  format: string
  rows: Row[]
}
const sessions = computed<Session[]>(() => {
  const byKey = new Map<string, Session>()
  for (const m of props.matches) {
    const key = `${dayKeyOf(m.tee_time)}|${m.format_name}`
    let s = byKey.get(key)
    if (!s) {
      s = { key, day: dayLabel(m.tee_time), format: m.format_name, rows: [] }
      byKey.set(key, s)
    }
    s.rows.push(rowOf(m))
  }
  return [...byKey.values()]
})
</script>
<template>
  <div :class="flat ? '' : 'overflow-hidden rounded-md border border-mrc-line bg-white'">
    <div v-for="s in sessions" :key="s.key" class="border-t border-mrc-line first:border-t-0">
      <!-- Session header: day on the left, format on the right. -->
      <div class="flex items-baseline justify-between bg-mrc-panel px-3 py-1.5 text-sm uppercase tracking-wide text-mrc-charcoal">
        <span class="font-semibold">{{ s.day }}</span>
        <span class="font-semibold">{{ s.format }}</span>
      </div>
      <div class="divide-y divide-mrc-line">
        <RouterLink
          v-for="r in s.rows"
          :key="r.id"
          :to="{ name: 'match', params: { tournamentId, matchId: r.id } }"
          class="flex items-center gap-3 px-3 py-3 transition hover:bg-mrc-panel"
        >
          <div class="w-14 shrink-0 text-sm text-mrc-muted">{{ r.time }}</div>
          <div class="min-w-0 flex-1 space-y-0.5 leading-tight">
            <p v-for="(side, i) in r.sides" :key="i" class="flex items-center gap-2" :class="side.dim ? 'text-mrc-muted' : 'text-mrc-ink'">
              <span class="inline-block h-2 w-2 shrink-0 rounded-full" :style="{ background: side.dot }" />
              <span class="min-w-0 truncate">{{ side.name }}</span>
            </p>
          </div>
          <div class="shrink-0 whitespace-nowrap text-right font-bold text-lg uppercase">
            <span v-if="r.status" :class="r.status.cls">
              {{ r.status.text }}
            </span>
            <span v-else class="text-mrc-faint">–</span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
