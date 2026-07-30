<script setup lang="ts">
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentPlayer } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { useBusy } from '@/composables/useBusy'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import TeamAssignRow from '@/components/admin/TeamAssignRow.vue'

const props = defineProps<{ id: string }>()

const { data, error, loading, refresh, retry } = useAsync(async () => {
  const [roster, teams] = await Promise.all([scorecardApi.getTournamentPlayers(props.id), scorecardApi.getTournamentTeams(props.id)])
  return { roster, teams }
})

const teams = computed(() => data.value?.teams ?? [])
const blueId = computed(() => teams.value.find((t) => t.color === 'Blue')?.id ?? null)
const redId = computed(() => teams.value.find((t) => t.color === 'Red')?.id ?? null)

const roster = computed(() =>
  [...(data.value?.roster ?? [])].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)),
)

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
const { isBusy, run } = useBusy()
function assign(p: TournamentPlayer, target: string | null) {
  if (p.team_id === target) return
  const prev = p.team_id
  return run(
    p.player_id,
    async () => {
      if (prev) await scorecardApi.undraftPlayer(prev, p.player_id)
      if (target) await scorecardApi.draftPlayer(target, p.player_id)
      // Leaving a team drops any captaincy there (the server clears it on undraft too).
      const prevTeam = teamOf(prev)
      if (prevTeam?.captain?.id === p.player_id) prevTeam.captain = null
      p.team_id = target
    },
    { error: `Couldn't update ${p.first_name} ${p.last_name}. Please try again.`, onError: refresh },
  )
}

// Captaincy is per-team: one captain, and only a drafted player can hold it. The C shows
// only where it's actionable — on a team with no captain yet (any drafted player, tap to
// set) or on the current captain (tap to clear) — so the list stays quiet once captains
// are set. To reassign, clear the current captain, then pick a new one.
function teamOf(id: string | null) {
  return id ? (teams.value.find((t) => t.id === id) ?? null) : null
}
function isCaptain(p: TournamentPlayer): boolean {
  return teamOf(p.team_id)?.captain?.id === p.player_id
}
function showCaptainToggle(p: TournamentPlayer): boolean {
  const t = teamOf(p.team_id)
  return !!t && (!t.captain || t.captain.id === p.player_id)
}
function toggleCaptain(p: TournamentPlayer) {
  if (!p.team_id) return
  const t = teamOf(p.team_id)
  return run(
    p.player_id,
    async () => {
      if (isCaptain(p)) {
        await scorecardApi.clearTeamCaptain(p.team_id!)
        if (t) t.captain = null
      } else {
        await scorecardApi.setTeamCaptain(p.team_id!, p.player_id)
        if (t) t.captain = { id: p.player_id, first_name: p.first_name, last_name: p.last_name }
      }
    },
    { error: "Couldn't update the captain. Please try again." },
  )
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
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- Chips and search box included, not just the rows: they sit above the list in the
             real page, and leaving them out drops the rows by their height when it lands. -->
        <div class="mb-3 flex flex-wrap gap-2">
          <SkeletonBlock v-for="n in 4" :key="n" radius="full" class="h-7 w-20" />
        </div>
        <SkeletonBlock radius="md" class="mb-4 h-10 w-full" />
        <SkeletonList :rows="8" />
      </template>
      <!-- Filter chips double as a live tally so you can see who's left to place. -->
      <div class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="c in chips"
          :key="c.key"
          type="button"
          @click="filter = c.key"
          class="rounded-full border px-3 py-1 text-sm font-semibold transition"
          :class="
            filter === c.key ? 'border-mrc-accent bg-mrc-accent text-white' : 'border-mrc-line text-mrc-muted hover:border-mrc-line-strong'
          "
        >
          {{ c.label }} <span class="tabular-nums opacity-80">{{ c.n }}</span>
        </button>
      </div>

      <BaseInput v-model="search" type="search" placeholder="Search players" class="mb-4" />

      <div class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
        <TeamAssignRow
          v-for="p in filtered"
          :key="p.player_id"
          :player="p"
          :blue-id="blueId"
          :red-id="redId"
          :busy="isBusy(p.player_id)"
          :show-captain="showCaptainToggle(p)"
          :is-captain="isCaptain(p)"
          @assign="(target) => assign(p, target)"
          @toggle-captain="toggleCaptain(p)"
        />
        <p v-if="!filtered.length" class="px-3 py-6 text-center text-mrc-muted">No players match.</p>
      </div>
    </AsyncState>
  </PageLayout>
</template>
