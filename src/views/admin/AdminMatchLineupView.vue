<script setup lang="ts">
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { formatTeeTime } from '@/lib/teeTime'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import XIcon from '@/components/icons/XIcon.vue'

const props = defineProps<{ id: string; matchId: string }>()

const { data, error, loading, refresh } = useAsync(() =>
  Promise.all([
    scorecardApi.getTournamentResults(props.id),
    scorecardApi.getTournamentTeams(props.id),
    scorecardApi.getTournamentPlayers(props.id),
  ]))

const match = computed(() => (data.value?.[0] ?? []).find((m) => m.match_id === props.matchId) ?? null)
const teams = computed(() => data.value?.[1] ?? [])
const roster = computed(() => data.value?.[2] ?? [])

// One slot per side for Singles, two for every pairs format (Fourball, Alt Shot, …).
const slots = computed(() => (match.value?.format_name === 'Singles' ? 1 : 2))

// A panel per side (Blue then Red): who's assigned now, and which drafted players are
// still available to add. Available = drafted on that team, minus who's already in.
const panels = computed(() => {
  const m = match.value
  if (!m) return []
  return teams.value.map((team) => {
    const assigned = m.sides.find((s) => s.team_id === team.id)?.players ?? []
    const assignedIds = new Set(assigned.map((p) => p.player_id))
    const available = roster.value
      .filter((p) => p.team_id === team.id && !assignedIds.has(p.player_id))
      .sort((a, b) => a.last_name.localeCompare(b.last_name))
    return { team, assigned, available }
  })
})

const busy = ref(false)
const failed = ref('')
async function run(fn: () => Promise<unknown>, label: string) {
  if (busy.value) return
  busy.value = true
  failed.value = ''
  try {
    await fn()
    await refresh()
  } catch {
    failed.value = `Couldn't ${label}. Please try again.`
  } finally {
    busy.value = false
  }
}
const add = (playerId: string, teamId: string) =>
  run(() => scorecardApi.addParticipant(props.matchId, playerId, teamId), 'add that player')
const remove = (playerId: string) =>
  run(() => scorecardApi.removeParticipant(props.matchId, playerId), 'remove that player')

function color(teamColor: string) {
  return teamColor === 'Blue'
    ? { head: 'text-mrc-blue-strong', dot: 'bg-mrc-blue-team', chip: 'border-mrc-blue-line bg-mrc-blue-tint' }
    : { head: 'text-mrc-red-strong', dot: 'bg-mrc-red-team', chip: 'border-mrc-red-line bg-mrc-red-tint' }
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
        <BaseAlert v-if="failed" variant="error" class="mb-4">{{ failed }}</BaseAlert>

        <div class="grid gap-4 md:grid-cols-2" :class="busy ? 'pointer-events-none opacity-60' : ''">
          <BaseCard v-for="panel in panels" :key="panel.team.id">
            <div class="flex items-center gap-2" :class="color(panel.team.color).head">
              <span class="inline-block h-2.5 w-2.5 rounded-full" :class="color(panel.team.color).dot" />
              <h4>{{ teamLabel(panel.team) }}</h4>
              <span class="ml-auto text-sm tabular-nums text-mrc-muted">{{ panel.assigned.length }}/{{ slots }}</span>
            </div>

            <!-- Assigned players — remove with the ×. -->
            <div class="mt-3 space-y-2">
              <div v-for="p in panel.assigned" :key="p.player_id"
                   class="flex items-center justify-between rounded border px-3 py-2" :class="color(panel.team.color).chip">
                <span class="min-w-0 truncate font-semibold">{{ p.first_name }} {{ p.last_name }}</span>
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
                        class="rounded-full border border-mrc-line px-3 py-1 text-sm transition hover:border-mrc-accent hover:text-mrc-accent"
                        @click="add(p.player_id, panel.team.id)">
                  + {{ p.first_name }} {{ p.last_name }}
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
