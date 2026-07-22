<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError, type MatchSide } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { useMatchSides } from '@/composables/useMatchSides'
import { playerSurnames } from '@/lib/matchResult'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import ScoreWheel from '@/components/tournament/ScoreWheel.vue'
import FlagIcon from '@/components/icons/FlagIcon.vue'

const props = defineProps<{ tournamentId: string; matchId: string; hole: string }>()
const router = useRouter()
const holeNumber = computed(() => Number(props.hole))

// Match/teams/holes are per-match, so this loads once; changing hole only re-derives.
const { data, error, loading } = useAsync(() =>
  Promise.all([
    scorecardApi.getTournamentTeams(props.tournamentId),
    scorecardApi.getTournamentResults(props.tournamentId),
    scorecardApi.getMatchHoles(props.matchId),
  ]),
)
const teams = computed(() => [...(data.value?.[0] ?? [])].sort((a, b) => a.id.localeCompare(b.id)))
const match = computed(() => (data.value?.[1] ?? []).find((m) => m.match_id === props.matchId) ?? null)
const holeInfo = computed(() => new Map((data.value?.[2] ?? []).map((h) => [h.number, h])).get(holeNumber.value) ?? null)

const { left, right } = useMatchSides(() => match.value, () => teams.value)
// A finished match is read-only (the write flow only makes sense for a live round).
const readonly = computed(() => match.value?.finished ?? false)

// Singles/Fourball record a score per player; one-ball formats (Alt Shot/Scramble/Scotch)
// record one score per team (player_id null).
const perPlayer = computed(() => ['Singles', 'Fourball'].includes(match.value?.format_name ?? ''))

interface Entry {
  key: string
  teamId: string
  playerId: string | null
  name: string
  strokes: number
}
const entries = ref<Entry[]>([])

function rebuild() {
  const par = holeInfo.value?.par ?? 4
  const sides = [left.value, right.value].filter((s): s is MatchSide => s != null)
  const list: Entry[] = []
  for (const side of sides) {
    if (perPlayer.value) {
      for (const p of side.players) {
        list.push({ key: p.player_id, teamId: side.team_id, playerId: p.player_id, name: `${p.first_name} ${p.last_name}`, strokes: par })
      }
    } else {
      list.push({ key: side.team_id, teamId: side.team_id, playerId: null, name: playerSurnames(side.players), strokes: par })
    }
  }
  entries.value = list
}
// Rebuild (resetting strokes to par) whenever the data arrives or the hole changes.
watch([() => props.hole, left, right, holeInfo], rebuild, { immediate: true })

const saving = ref(false)
const saveError = ref('')
const buttonLabel = computed(() => {
  const last = holeNumber.value >= 18
  if (readonly.value) return last ? 'Back to Scorecard' : 'Next Hole'
  return last ? 'Save & Finish' : 'Save & Next Hole'
})

function goNext() {
  const n = holeNumber.value
  if (n < 18) router.push({ name: 'hole', params: { tournamentId: props.tournamentId, matchId: props.matchId, hole: n + 1 } })
  else router.push({ name: 'match', params: { tournamentId: props.tournamentId, matchId: props.matchId } })
}
async function saveAndNext() {
  if (readonly.value) return goNext()
  saving.value = true
  saveError.value = ''
  try {
    // Sequential so the match result recompute on each write stays ordered.
    for (const e of entries.value) {
      await scorecardApi.submitScore(props.matchId, {
        hole_number: holeNumber.value,
        strokes: e.strokes,
        team_id: e.teamId,
        player_id: e.playerId,
      })
    }
    goNext()
  } catch (err) {
    saveError.value = err instanceof ApiError ? `Save failed — ${err.message}` : 'Save failed. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <PageLayout>
    <AsyncState :loading="loading" :error="error">
      <template v-if="match && holeInfo">
        <!-- Sticky context: the match summary, with the hole details on one line below it. -->
        <div class="sticky top-0 z-10 -mx-4 border-b border-mrc-line-strong bg-mrc-surface px-2 pb-3 shadow">
          <MatchSummary :match="match" :teams="teams" />
          <div class="mt-3 flex items-center justify-center gap-10 text-mrc-muted">
            <span class="flex items-center gap-2 text-xl font-semibold">
              <FlagIcon />{{ hole }}
            </span>
            <span>Par {{ holeInfo.par }}</span>
            <span>{{ holeInfo.yards }} Yards</span>
            <span>HDCP {{ holeInfo.hdcp }}</span>
          </div>
        </div>

        <div class="mt-6 -mx-4 divide-y divide-mrc-line border-b border-mrc-line">
          <ScoreWheel v-for="e in entries" :key="e.key" v-model="e.strokes"
                      :par="holeInfo.par" :name="e.name" :readonly="readonly" />
        </div>

        <p v-if="saveError" class="mt-6 text-center text-sm text-mrc-red-team">{{ saveError }}</p>
        <button type="button" class="mt-6 w-full rounded-md bg-mrc-accent py-4 font-semibold text-white transition hover:bg-mrc-accent-dark disabled:opacity-60"
                :disabled="saving" @click="saveAndNext">
          {{ saving ? 'Saving…' : buttonLabel }}
        </button>
      </template>
      <p v-else class="mt-4 text-mrc-muted">Hole not found.</p>
    </AsyncState>
  </PageLayout>
</template>
