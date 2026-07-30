<script setup lang="ts">
import { computed, ref } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import { useAsync } from '@/composables/useAsync'
import { useBusy } from '@/composables/useBusy'
import { formatTeeTime, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'
import { teamColor } from '@/lib/teamColor'
import PageLayout from '@/components/layout/PageLayout.vue'
import TierDot from '@/components/base/TierDot.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import XIcon from '@/components/icons/XIcon.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'

const props = defineProps<{ id: string; matchId: string }>()

const { data, error, loading, refresh, retry } = useAsync(async () => {
  const [matches, teams, roster, courses] = await Promise.all([
    scorecardApi.getTournamentResults(props.id),
    scorecardApi.getTournamentTeams(props.id),
    scorecardApi.getTournamentPlayers(props.id),
    scorecardApi.listCourses(),
  ])
  return { matches, teams, roster, courses }
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
  run(
    true,
    async () => {
      await scorecardApi.addParticipant(props.matchId, playerId, teamId)
      await refresh()
    },
    { error: "Couldn't add that player. Please try again." },
  )
const remove = (playerId: string) =>
  run(
    true,
    async () => {
      await scorecardApi.removeParticipant(props.matchId, playerId)
      await refresh()
    },
    { error: "Couldn't remove that player. Please try again." },
  )

// Assigned players come from the match sides (no tier); look their flight up on the roster
// so the swatch shows on both assigned and available pills — handy for keeping a pairing even.
function tierOf(playerId: string): string {
  return roster.value.find((p) => p.player_id === playerId)?.tier ?? ''
}

// Teams read by their captain ("Team Bale"); fall back to the colour until one is named.
function teamLabel(team: { color: string; captain: { last_name: string } | null }) {
  return team.captain ? `Team ${team.captain.last_name}` : team.color
}

// A tee time is typed as the wall clock the tee sheet says, so it is read at the course
// being played rather than wherever the admin happens to be. Courses are unique by name
// per tenant, which is what makes matching the result's course_name to a course sound.
const courses = computed(() => data.value?.courses ?? [])
const courseZone = computed(() => courses.value.find((c) => c.name === match.value?.course_name)?.time_zone ?? 'America/Winnipeg')

const editingTeeTime = ref(false)
const teeTimeInput = ref('')

function startEditTeeTime() {
  if (!match.value) return
  teeTimeInput.value = utcToEventInput(match.value.tee_time, courseZone.value)
  editingTeeTime.value = true
}

const saveTeeTime = () =>
  run(
    'tee-time',
    async () => {
      await scorecardApi.updateMatch(props.matchId, { tee_time: eventInputToUtc(teeTimeInput.value, courseZone.value) })
      editingTeeTime.value = false
      await refresh()
    },
    { error: "Couldn't move that tee time. Please try again." },
  )
</script>
<template>
  <PageLayout title="Match Lineup" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <SkeletonBlock class="mx-auto mb-4 h-4 w-72" />
        <SkeletonGrid :cards="2" />
      </template>
      <template v-if="match">
        <p class="mb-4 text-center text-mrc-muted">
          <span class="font-semibold uppercase tracking-widest">{{ match.format_name }}</span>
          ·
          <button
            v-if="!editingTeeTime"
            type="button"
            class="underline decoration-dotted underline-offset-4 transition hover:text-mrc-accent"
            @click="startEditTeeTime"
          >
            {{ formatTeeTime(match.tee_time) }}
          </button>
          <span v-else class="tabular-nums">{{ formatTeeTime(match.tee_time) }}</span>
          <template v-if="match.course_name"> · {{ match.course_name }}</template>
        </p>

        <!-- Moving a tee time, for the group that went out late. Typed as the wall clock
             the tee sheet says and read at the course, so an admin entering it from another
             province still gets the round's own morning. -->
        <form v-if="editingTeeTime" class="mb-4 flex flex-wrap items-end justify-center gap-2" @submit.prevent="saveTeeTime">
          <div>
            <BaseLabel for="tee-time">Tee time</BaseLabel>
            <input
              id="tee-time"
              v-model="teeTimeInput"
              type="datetime-local"
              required
              class="rounded border border-mrc-line bg-mrc-surface px-3 py-2"
            />
          </div>
          <BaseButton type="submit" :loading="isBusy('tee-time')">Save</BaseButton>
          <BaseButton type="button" variant="secondary" :disabled="isBusy('tee-time')" @click="editingTeeTime = false">Cancel</BaseButton>
        </form>
        <div class="grid gap-4 md:grid-cols-2" :class="isBusy() ? 'pointer-events-none opacity-60' : ''">
          <BaseCard v-for="panel in panels" :key="panel.team.id">
            <div class="flex items-center gap-2" :class="panel.colors.textStrong">
              <span class="inline-block h-2.5 w-2.5 rounded-full" :class="panel.colors.solid" />
              <h3>{{ teamLabel(panel.team) }}</h3>
              <span class="ml-auto tabular-nums text-mrc-muted">{{ panel.assigned.length }}/{{ slots }}</span>
            </div>

            <!-- Assigned players — remove with the ×. -->
            <div class="mt-3 space-y-2">
              <div
                v-for="p in panel.assigned"
                :key="p.player_id"
                class="flex items-center justify-between rounded border px-3 py-2"
                :class="[panel.colors.tint, panel.colors.line]"
              >
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate">{{ p.first_name }} {{ p.last_name }}</span>
                  <TierDot :tier="tierOf(p.player_id)" />
                </div>
                <button type="button" aria-label="Remove" class="shrink-0 text-mrc-muted hover:text-mrc-ink" @click="remove(p.player_id)">
                  <XIcon />
                </button>
              </div>
              <p v-if="!panel.assigned.length" class="text-mrc-faint">No players assigned yet.</p>
            </div>

            <!-- Add from this team's drafted players, until the slots are full. -->
            <template v-if="panel.assigned.length < slots">
              <CapsLabel size="sm" class="mt-4 text-mrc-muted">Add a player</CapsLabel>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="p in panel.available"
                  :key="p.player_id"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-mrc-line px-3 py-1 transition hover:border-mrc-accent hover:text-mrc-accent"
                  @click="add(p.player_id, panel.team.id)"
                >
                  {{ p.first_name }} {{ p.last_name }}
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
