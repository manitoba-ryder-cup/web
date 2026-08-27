<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { type LineupPlayer, type UpdateMatchBody } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { useAfterMatchWrite } from '@/composables/useAfterWrite'
import { useBusy } from '@/composables/useBusy'
import { useCourseTees } from '@/composables/useCourseTees'
import { toast } from '@/composables/useToast'
import { displayError } from '@/lib/displayError'
import { isRefusal } from '@/lib/apiError'
import { availableForTeam, playersSpent } from '@/lib/lineup'
import { sideSize } from '@/lib/matchResult'
import { CUP_TIME_ZONE, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'
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

const { data, error, loading, retry } = useAsync(
  // Tournament-scoped: every request below is about the tournament and the match only selects
  // from the result. Keyed by match, eight lineups would fetch the same four endpoints eight times.
  () => ['admin', 'lineup', props.id],
  async () => {
    const [matches, records, teams, roster, courses] = await Promise.all([
      scorecardApi.getTournamentResults(props.id),
      scorecardApi.listMatches(props.id),
      scorecardApi.getTournamentTeams(props.id),
      scorecardApi.getTournamentPlayers(props.id),
      scorecardApi.listCourses(),
    ])
    return { matches, records, teams, roster, courses }
  },
)

const matches = computed(() => data.value?.matches ?? [])
// The result carries a course name and no ids, and no tee colour at all — the match record is
// what the pickers below are set from.
const record = computed(() => (data.value?.records ?? []).find((m) => m.id === props.matchId) ?? null)
const match = computed(() => matches.value.find((m) => m.match_id === props.matchId) ?? null)
const teams = computed(() => data.value?.teams ?? [])
const roster = computed(() => data.value?.roster ?? [])

// The match's own format, resolved by the server, rather than its id looked up in a list that
// may not hold it. Floored, because a side size of nothing hides the controls that fill it.
const slots = computed(() => sideSize(match.value?.players_per_side))

// The lineup is edited here and written whole, so this holds it until Save. A watcher, not an
// initial value: the match arrives after mount and this has to re-settle after each save.
const storedLineup = computed<LineupPlayer[]>(() =>
  (match.value?.sides ?? []).flatMap((side) => side.players.map((p) => ({ player_id: p.player_id, team_id: side.team_id }))),
)
const asKey = (entries: LineupPlayer[]) =>
  entries
    .map((p) => `${p.team_id}:${p.player_id}`)
    .sort()
    .join('|')

// Keyed, because storedLineup builds a new array every evaluation: watching it directly would
// re-seed the draft on any refetch, including the one after a save this page refused.
const lineup = ref<LineupPlayer[]>([])
watch(
  () => asKey(storedLineup.value),
  () => (lineup.value = storedLineup.value.map((p) => ({ ...p }))),
  { immediate: true },
)
const lineupChanged = computed(() => asKey(lineup.value) !== asKey(storedLineup.value))

const addToLineup = (playerId: string, teamId: string) => lineup.value.push({ player_id: playerId, team_id: teamId })
const removeFromLineup = (playerId: string) => (lineup.value = lineup.value.filter((p) => p.player_id !== playerId))

const panels = computed(() => {
  const m = match.value
  if (!m) return []
  const spent = playersSpent(matches.value, props.matchId, m.format_name, lineup.value)
  return teams.value.map((team) => ({
    team,
    assigned: lineup.value.filter((p) => p.team_id === team.id).map((p) => ({ player_id: p.player_id, ...nameOf(p.player_id) })),
    available: availableForTeam(roster.value, team.id, spent),
    colors: teamColor(team.color),
  }))
})

// The draft holds ids; the roster is where the names are.
function nameOf(playerId: string): { first_name: string; last_name: string } {
  const p = roster.value.find((r) => r.player_id === playerId)
  return { first_name: p?.first_name ?? '', last_name: p?.last_name ?? '' }
}

const { isBusy, run } = useBusy()

// Assigned players come from the match sides (no tier); look their flight up on the roster
// so the swatch shows on both assigned and available pills — handy for keeping a pairing even.
function tierOf(playerId: string): string {
  return roster.value.find((p) => p.player_id === playerId)?.tier ?? ''
}

// Teams read by their captain ("Team Bale"); fall back to the colour until one is named.
function teamLabel(team: { color: string; captain: { last_name: string } | null }) {
  return team.captain ? `Team ${team.captain.last_name}` : team.color
}

const courses = computed(() => data.value?.courses ?? [])
const zoneOf = (id: string | undefined) => courses.value.find((c) => c.id === id)?.time_zone ?? CUP_TIME_ZONE

// Reading back: the stored course, so picking another does not re-read a tee time nobody moved.
const courseZone = computed(() => zoneOf(record.value?.course_id))
// Writing: the course being saved, or a wall clock typed off the new tee sheet lands in the
// zone of the old one.
const zoneBeingSaved = computed(() => (teeSetChanged.value ? zoneOf(courseId.value) : courseZone.value))

// A watcher, not an initial value: the match arrives after mount, and this has to re-settle
// after each save.
const storedTeeTime = computed(() => (match.value ? utcToEventInput(match.value.tee_time, courseZone.value) : ''))
const teeTimeInput = ref('')
watch(storedTeeTime, (wall) => (teeTimeInput.value = wall), { immediate: true })

const teeTimeChanged = computed(() => !!teeTimeInput.value && teeTimeInput.value !== storedTeeTime.value)

// Same field styling the setup screen uses. [color-scheme:light] keeps the native
// datetime picker legible against the white field when the OS is in dark mode.
const fieldClass = 'block w-full rounded border border-mrc-line-strong bg-white px-3 py-2 text-mrc-ink shadow-sm [color-scheme:light]'

// Which tees a match is played from decides the par and stroke index its scores are read
// against, so it belongs to the match rather than the round.
const courseId = ref('')
const { tees: courseTees, failed: teesFailed, selected: teeColorId, load: loadTees, retry: retryTees } = useCourseTees()

watch(
  record,
  (m) => {
    if (!m || courseId.value === m.course_id) return
    courseId.value = m.course_id
    void loadTees(m.course_id, m.tee_color_id)
  },
  { immediate: true },
)

// Back on the match's own course, its own tee is what to restore: without that, a round trip
// through another course arms a tee change nobody asked for.
const onCourseChange = () => loadTees(courseId.value, courseId.value === record.value?.course_id ? record.value.tee_color_id : undefined)

const teeSetChanged = computed(
  () =>
    !!record.value && !!teeColorId.value && (courseId.value !== record.value.course_id || teeColorId.value !== record.value.tee_color_id),
)

// Every side holding exactly what the format takes, which is what the API will accept. The
// page can see this, so it says so rather than spending a request to be told.
const lineupComplete = computed(() => panels.value.length > 0 && panels.value.every((p) => p.assigned.length === slots.value))

const changed = computed(() => teeSetChanged.value || teeTimeChanged.value || lineupChanged.value)
// A course picked with no tee to go with it — still loading, or the load failed. Saving here
// would write everything except the course and call it done.
const teeSetUnresolved = computed(() => !!record.value && courseId.value !== record.value.course_id && !teeColorId.value)
const savable = computed(() => changed.value && !teeSetUnresolved.value && (!lineupChanged.value || lineupComplete.value))

// Only what moved is sent. An edit that leaves the tee set alone must not mention it: the
// API refuses a scored match's tee set, and re-sending the stored value is not a change.
function edits() {
  const body: UpdateMatchBody = {}
  if (teeSetChanged.value) {
    body.course_id = courseId.value
    body.tee_color_id = teeColorId.value
  }
  // Sent when the course moves even if nobody touched the clock: the tee sheet at the new
  // course says the time on screen, and holding the instant instead would shift it.
  if (teeTimeChanged.value || teeSetChanged.value) {
    body.tee_time = eventInputToUtc(teeTimeInput.value, zoneBeingSaved.value)
  }
  return body
}

// Details before the lineup, and only what moved. A scored match takes a tee time and refuses
// a lineup, so in this order the edit it allows lands and the one it refuses says why.
const router = useRouter()
const afterMatchWrite = useAfterMatchWrite()
const save = () =>
  run(
    'save',
    async () => {
      try {
        if (teeSetChanged.value || teeTimeChanged.value) await scorecardApi.updateMatch(props.matchId, edits())
        if (lineupChanged.value) await scorecardApi.setLineup(props.matchId, lineup.value)
      } catch (err) {
        // A lineup naming an undrafted player answers 400 and a deleted match 404, and
        // "please try again" invites a retry that cannot work.
        if (!isRefusal(err)) throw err
        toast.error(displayError(err))
        return
      } finally {
        // useBusy reaches the lists; the match's own two copies are the ones it leaves, and a
        // refusal still needs them, because the tee time lands before the lineup is turned down.
        await afterMatchWrite(props.id, props.matchId)
      }
      toast.success('Match saved')
      // The row on the list carries the tee time and the pairing, which is the change in the
      // context it was made for.
      await router.push({ name: 'admin-tournament', params: { id: props.id } })
    },
    { error: "Couldn't save those changes. Please try again." },
  )
</script>
<template>
  <PageLayout title="Edit Match" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <SkeletonBlock class="mx-auto mb-4 h-4 w-72" />
        <SkeletonGrid :cards="2" />
      </template>
      <template v-if="match">
        <CapsLabel as="h2" size="sm" class="mb-3 text-mrc-muted">Details</CapsLabel>
        <form @submit.prevent="save">
          <!-- The course carries the zone the clock beside it is read in, so moving a match
               leaves the instant alone and re-reads it, which the tee time shows happening. -->
          <div class="mb-3">
            <BaseLabel for="course">Course</BaseLabel>
            <select id="course" v-model="courseId" :class="fieldClass" @change="onCourseChange">
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="mb-4 flex gap-3">
            <div class="min-w-0 flex-1">
              <BaseLabel for="tee">Tees</BaseLabel>
              <select id="tee" v-model="teeColorId" :class="fieldClass" :disabled="!courseTees.length">
                <option v-for="t in courseTees" :key="t.tee_color_id" :value="t.tee_color_id">{{ t.color }}</option>
              </select>
              <template v-if="teesFailed">
                <p class="mt-1 text-sm text-mrc-charcoal">Couldn't load this course's tees.</p>
                <button
                  type="button"
                  class="mt-2 w-full rounded-md bg-mrc-accent py-3 font-semibold text-white transition hover:bg-mrc-accent-dark"
                  @click="retryTees"
                >
                  Try again
                </button>
              </template>
            </div>
            <div class="min-w-0 flex-1">
              <BaseLabel for="tee-time">Tee time</BaseLabel>
              <input id="tee-time" v-model="teeTimeInput" type="datetime-local" required :class="fieldClass" />
            </div>
          </div>

          <CapsLabel as="h2" size="sm" class="mb-3 text-mrc-muted">Players</CapsLabel>
          <div class="grid gap-4 md:grid-cols-2">
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
                  <!-- The × is 16px of glyph; the negative margins buy it a 44px target without
                     making the row taller than the tap it has to accept. -->
                  <button
                    type="button"
                    aria-label="Remove"
                    class="-my-2 -mr-3 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-mrc-muted hover:text-mrc-ink"
                    @click="removeFromLineup(p.player_id)"
                  >
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
                    @click="addToLineup(p.player_id, panel.team.id)"
                  >
                    {{ p.first_name }} {{ p.last_name }}
                    <TierDot :tier="p.tier" size="xs" />
                  </button>
                  <p v-if="!panel.available.length" class="text-sm text-mrc-faint">No drafted players left to add.</p>
                </div>
              </template>
            </BaseCard>
          </div>

          <p v-if="lineupChanged && !lineupComplete" class="mt-3 text-mrc-charcoal">
            Each side needs {{ slots }} player{{ slots === 1 ? '' : 's' }} before this lineup can be saved.
          </p>

          <!-- One Save for the page: the tee set, the tee time and the lineup are all edits to
               the same match, and the lineup can only be written whole anyway. -->
          <div class="mt-4 flex justify-end">
            <BaseButton type="submit" :loading="isBusy('save')" :disabled="!savable">Save</BaseButton>
          </div>
        </form>
      </template>
      <p v-else class="mt-6 text-center text-mrc-muted">Match not found.</p>
    </AsyncState>
  </PageLayout>
</template>
