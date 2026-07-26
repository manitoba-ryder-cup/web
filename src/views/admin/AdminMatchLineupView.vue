<script setup lang="ts">
import { computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useBusy } from '@/composables/useBusy'
import { formatTeeTime } from '@/lib/teeTime'
import { teamColor } from '@/lib/teamColor'
import PageLayout from '@/components/layout/PageLayout.vue'
import TierDot from '@/components/base/TierDot.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import XIcon from '@/components/icons/XIcon.vue'

const props = defineProps<{ id: string; matchId: string }>()

const { data, error, loading, refresh } = useAsync(async () => {
  const [matches, teams, roster] = await Promise.all([
    scorecardApi.getTournamentResults(props.id),
    scorecardApi.getTournamentTeams(props.id),
    scorecardApi.getTournamentPlayers(props.id),
  ])
  return { matches, teams, roster }
})

const matches = computed(() => data.value?.matches ?? [])
const match = computed(() => matches.value.find((m) => m.match_id === props.matchId) ?? null)
const teams = computed(() => data.value?.teams ?? [])
const roster = computed(() => data.value?.roster ?? [])

// One slot per side for Singles, two for every pairs format (Fourball, Alt Shot, …).
const slots = computed(() => (match.value?.format_name === 'Singles' ? 1 : 2))

// A panel per side (Blue then Red): who's assigned now, and which drafted players are
// available to add. A player plays at most once per round, so availability is scoped to the
// whole format: every drafted player is eligible except those already placed in any match of
// this round (including this one — those show in the assigned list, not as available).
const panels = computed(() => {
  const m = match.value
  if (!m) return []
  const bookedInRound = new Set<string>()
  for (const other of matches.value) {
    if (other.format_name !== m.format_name) continue
    for (const side of other.sides) for (const pl of side.players) bookedInRound.add(pl.player_id)
  }
  return teams.value.map((team) => {
    const assigned = m.sides.find((s) => s.team_id === team.id)?.players ?? []
    const available = roster.value
      .filter((p) => p.team_id === team.id && !bookedInRound.has(p.player_id))
      .sort((a, b) => a.last_name.localeCompare(b.last_name))
    return { team, assigned, available, colors: teamColor(team.color) }
  })
})

const { isBusy, run } = useBusy()
const add = (playerId: string, teamId: string) =>
  run(true, async () => {
    await scorecardApi.addParticipant(props.matchId, playerId, teamId)
    await refresh()
  }, { error: "Couldn't add that player. Please try again." })
const remove = (playerId: string) =>
  run(true, async () => {
    await scorecardApi.removeParticipant(props.matchId, playerId)
    await refresh()
  }, { error: "Couldn't remove that player. Please try again." })

// Assigned players come from the match sides (no tier); look their flight up on the roster
// so the swatch shows on both assigned and available pills — handy for keeping a pairing even.
function tierOf(playerId: string): string {
  return roster.value.find((p) => p.player_id === playerId)?.tier ?? ''
}

// Teams read by their captain ("Team Bale"); fall back to the colour until one is named.
function teamLabel(team: { color: string; captain: { last_name: string } | null }) {
  return team.captain ? `Team ${team.captain.last_name}` : team.color
}
</script>
<template>
  <PageLayout title="Match Lineup" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error">
      <template v-if="match">
        <p class="mb-4 text-center text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          <template v-if="formatTeeTime(match.tee_time)"> · {{ formatTeeTime(match.tee_time) }}</template>
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>
        <div class="grid gap-4 md:grid-cols-2" :class="isBusy() ? 'pointer-events-none opacity-60' : ''">
          <BaseCard v-for="panel in panels" :key="panel.team.id">
            <div class="flex items-center gap-2" :class="panel.colors.textStrong">
              <span class="inline-block h-2.5 w-2.5 rounded-full" :class="panel.colors.solid" />
              <h4>{{ teamLabel(panel.team) }}</h4>
              <span class="ml-auto text-sm tabular-nums text-mrc-muted">{{ panel.assigned.length }}/{{ slots }}</span>
            </div>

            <!-- Assigned players — remove with the ×. -->
            <div class="mt-3 space-y-2">
              <div v-for="p in panel.assigned" :key="p.player_id"
                   class="flex items-center justify-between rounded border px-3 py-2" :class="[panel.colors.tint, panel.colors.line]">
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate font-semibold">{{ p.first_name }} {{ p.last_name }}</span>
                  <TierDot :tier="tierOf(p.player_id)" />
                </div>
                <button type="button" aria-label="Remove" class="shrink-0 text-mrc-muted hover:text-mrc-ink" @click="remove(p.player_id)">
                  <XIcon />
                </button>
              </div>
              <p v-if="!panel.assigned.length" class="text-sm text-mrc-faint">No players assigned yet.</p>
            </div>

            <!-- Add from this team's drafted players, until the slots are full. -->
            <template v-if="panel.assigned.length < slots">
              <p class="mt-4 text-xs font-semibold uppercase tracking-widest text-mrc-muted">Add a player</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button v-for="p in panel.available" :key="p.player_id" type="button"
                        class="inline-flex items-center gap-1.5 rounded-full border border-mrc-line px-3 py-1 text-sm transition hover:border-mrc-accent hover:text-mrc-accent"
                        @click="add(p.player_id, panel.team.id)">
                  + {{ p.first_name }} {{ p.last_name }}
                  <TierDot :tier="p.tier" size="xs" />
                </button>
                <p v-if="!panel.available.length" class="text-sm text-mrc-faint">No drafted players left to add.</p>
              </div>
            </template>
          </BaseCard>
        </div>
      </template>
      <p v-else class="mt-6 text-center text-mrc-muted">Match not found.</p>
    </AsyncState>
  </PageLayout>
</template>
