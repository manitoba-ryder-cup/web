<script setup lang="ts">
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentPlayer } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'

const props = defineProps<{ id: string }>()

const { data, error, loading, refresh } = useAsync(() =>
  Promise.all([scorecardApi.getTournamentPlayers(props.id), scorecardApi.getTournamentTeams(props.id)]))

const teams = computed(() => data.value?.[1] ?? [])
const blueId = computed(() => teams.value.find((t) => t.color === 'Blue')?.id ?? null)
const redId = computed(() => teams.value.find((t) => t.color === 'Red')?.id ?? null)

const roster = computed(() =>
  [...(data.value?.[0] ?? [])].sort(
    (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)))

const counts = computed(() => ({
  all: roster.value.length,
  unassigned: roster.value.filter((p) => !p.team_id).length,
  blue: roster.value.filter((p) => p.team_id === blueId.value).length,
  red: roster.value.filter((p) => p.team_id === redId.value).length,
}))

type Filter = 'all' | 'unassigned' | 'blue' | 'red'
const filter = ref<Filter>('all')
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return roster.value.filter((p) => {
    if (filter.value === 'unassigned' && p.team_id) return false
    if (filter.value === 'blue' && p.team_id !== blueId.value) return false
    if (filter.value === 'red' && p.team_id !== redId.value) return false
    if (q && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(q)) return false
    return true
  })
})

// The captain calls a pick; we record it. Reassigning is undraft-then-draft; clearing is
// just an undraft. We only update the row once the writes succeed, and re-sync from the
// server if anything fails (so a half-applied move never leaves the UI lying).
const busyId = ref('')
const failed = ref('')
async function assign(p: TournamentPlayer, target: string | null) {
  if (busyId.value || p.team_id === target) return
  busyId.value = p.player_id
  failed.value = ''
  const prev = p.team_id
  try {
    if (prev) await scorecardApi.undraftPlayer(prev, p.player_id)
    if (target) await scorecardApi.draftPlayer(target, p.player_id)
    // Leaving a team drops any captaincy there (the server clears it on undraft too).
    const prevTeam = teamOf(prev)
    if (prevTeam?.captain?.id === p.player_id) prevTeam.captain = null
    p.team_id = target
  } catch {
    failed.value = `Couldn't update ${p.first_name} ${p.last_name}. Please try again.`
    await refresh()
  } finally {
    busyId.value = ''
  }
}

// Captaincy is per-team: one captain, replaced on set, and only a drafted player can hold
// it. The server enforces the same, but we mirror it locally for a snappy toggle.
function teamOf(id: string | null) {
  return id ? teams.value.find((t) => t.id === id) ?? null : null
}
function isCaptain(p: TournamentPlayer): boolean {
  return teamOf(p.team_id)?.captain?.id === p.player_id
}
async function setCaptain(p: TournamentPlayer) {
  if (busyId.value || !p.team_id || isCaptain(p)) return
  busyId.value = p.player_id
  failed.value = ''
  try {
    await scorecardApi.setTeamCaptain(p.team_id, p.player_id)
    const t = teamOf(p.team_id)
    if (t) t.captain = { id: p.player_id, first_name: p.first_name, last_name: p.last_name, email: p.email }
  } catch {
    failed.value = `Couldn't make ${p.first_name} ${p.last_name} captain. Please try again.`
    await refresh()
  } finally {
    busyId.value = ''
  }
}

const chips = computed<{ key: Filter; label: string; n: number }[]>(() => [
  { key: 'all', label: 'All', n: counts.value.all },
  { key: 'unassigned', label: 'Unassigned', n: counts.value.unassigned },
  { key: 'blue', label: 'Blue', n: counts.value.blue },
  { key: 'red', label: 'Red', n: counts.value.red },
])
</script>
<template>
  <PageLayout title="Assign Teams" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error">
      <BaseAlert v-if="failed" variant="error" class="mb-4">{{ failed }}</BaseAlert>

      <!-- Filter chips double as a live tally so you can see who's left to place. -->
      <div class="mb-3 flex flex-wrap gap-2">
        <button v-for="c in chips" :key="c.key" type="button" @click="filter = c.key"
                class="rounded-full border px-3 py-1 text-sm font-semibold transition"
                :class="filter === c.key ? 'border-mrc-accent bg-mrc-accent text-white' : 'border-mrc-line text-mrc-muted hover:border-mrc-line-strong'">
          {{ c.label }} <span class="tabular-nums opacity-80">{{ c.n }}</span>
        </button>
      </div>

      <BaseInput v-model="search" type="search" placeholder="Search players" class="mb-4" />

      <div class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
        <div v-for="p in filtered" :key="p.player_id"
             class="flex items-center gap-3 border-b border-mrc-line px-3 py-2 last:border-b-0">
          <PlayerAvatar :photo-path="p.photo_path" :alt="`${p.first_name} ${p.last_name}`" size="sm" class="!h-10 !w-10" />
          <span class="min-w-0 flex-1 truncate font-semibold">{{ p.first_name }} {{ p.last_name }}</span>
          <!-- Captain toggle (gold C). Always shown so rows don't shift; disabled until the
               player is on a team. Setting it replaces that team's previous captain. -->
          <button type="button" :disabled="!p.team_id || busyId === p.player_id" @click="setCaptain(p)"
                  :aria-pressed="isCaptain(p)" :title="isCaptain(p) ? 'Team captain' : 'Make captain'"
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition"
                  :class="isCaptain(p) ? 'border-mrc-gold bg-mrc-gold text-white'
                    : !p.team_id ? 'border-mrc-line text-mrc-line-strong'
                    : 'border-mrc-line text-mrc-faint hover:border-mrc-gold hover:text-mrc-gold'">C</button>
          <!-- Blue / Red, each a toggle: tap the active colour again to unassign. -->
          <div class="flex shrink-0 overflow-hidden rounded border border-mrc-line" role="group"
               :class="busyId === p.player_id ? 'opacity-50' : ''">
            <button type="button" :disabled="busyId === p.player_id" @click="assign(p, p.team_id === blueId ? null : blueId)"
                    class="w-14 py-1.5 text-sm font-semibold transition"
                    :class="p.team_id === blueId ? 'bg-mrc-blue-team text-white' : 'bg-white text-mrc-muted hover:bg-mrc-blue-tint'">Blue</button>
            <button type="button" :disabled="busyId === p.player_id" @click="assign(p, p.team_id === redId ? null : redId)"
                    class="w-14 border-l border-mrc-line py-1.5 text-sm font-semibold transition"
                    :class="p.team_id === redId ? 'bg-mrc-red-team text-white' : 'bg-white text-mrc-muted hover:bg-mrc-red-tint'">Red</button>
          </div>
        </div>
        <p v-if="!filtered.length" class="px-3 py-6 text-center text-mrc-muted">No players match.</p>
      </div>
    </AsyncState>
  </PageLayout>
</template>
