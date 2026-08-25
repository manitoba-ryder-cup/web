<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { ApiError, type MatchResult, type TeeSetSummary } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { toast } from '@/composables/useToast'
import { useBusy } from '@/composables/useBusy'
import { playerSurnames } from '@/lib/matchResult'
import { formatTeeTime, teeDayKey, teeDayLabel, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'
import TrashIcon from '@/components/icons/TrashIcon.vue'

const props = defineProps<{ id: string }>()

// Results carry each match's sides + tee time (for the list); match-formats map a format
// name to its id (for creating); courses feed the add-match picker.
const { data, error, loading, refresh, retry } = useAsync(
  () => ['admin', 'tournament', props.id],
  async () => {
    const [tournament, matches, matchFormats, courses] = await Promise.all([
      scorecardApi.getTournament(props.id),
      scorecardApi.getTournamentResults(props.id),
      scorecardApi.listMatchFormats(),
      scorecardApi.listCourses(),
    ])
    return { tournament, matches, matchFormats, courses }
  },
)
const tournament = computed(() => data.value?.tournament ?? null)
const matches = computed(() => data.value?.matches ?? [])
const matchFormats = computed(() => data.value?.matchFormats ?? [])
const courses = computed(() => data.value?.courses ?? [])

// The running order, which is what setup is actually arranging. Grouped by day because the
// time on a row carries no date, and two days of a cup both start at eight.
const days = computed(() => {
  const groups = new Map<string, MatchResult[]>()
  for (const m of [...matches.value].sort((a, b) => a.tee_time.localeCompare(b.tee_time))) {
    groups.set(teeDayKey(m.tee_time), [...(groups.get(teeDayKey(m.tee_time)) ?? []), m])
  }
  return [...groups.values()].map((ms) => ({ key: teeDayKey(ms[0].tee_time), label: teeDayLabel(ms[0].tee_time), matches: ms }))
})

// The last match on the sheet: what a new one is most likely to follow, and what its course,
// format and tee time default from.
const latest = computed(() => [...matches.value].sort((a, b) => a.tee_time.localeCompare(b.tee_time)).pop() ?? null)

// A short "Bale/Phin vs Fordyce/Ray" for each match, or a hint when a side is empty.
function pairing(sides: { players: { player_id: string; first_name: string; last_name: string }[] }[]): string {
  const label = (i: number) => (sides[i]?.players.length ? playerSurnames(sides[i].players) : 'Not set')
  return `${label(0)} vs ${label(1)}`
}

// --- Add match ---
const adding = ref(false)
const creating = ref(false)
const formError = ref('')
const courseTees = ref<TeeSetSummary[]>([])
const form = reactive({ formatId: '', courseId: '', teeColorId: '', teeTime: '', handicapped: false })
// A tee time is typed as the wall clock the tee sheet says; the course it is played at is
// what turns that into an instant.
const selectedCourseZone = computed(() => courses.value.find((c) => c.id === form.courseId)?.time_zone ?? 'America/Winnipeg')

async function loadTees() {
  form.teeColorId = ''
  courseTees.value = []
  if (!form.courseId) return
  try {
    courseTees.value = await scorecardApi.getCourseTees(form.courseId)
    form.teeColorId = courseTees.value[0]?.tee_color_id ?? ''
  } catch {
    courseTees.value = []
  }
}

// Everything defaults off the last match on the sheet, because matches are added in runs: the
// next slot ten minutes later, at the same course, in the same format.
async function openForm() {
  formError.value = ''
  const last = latest.value
  form.formatId = matchFormats.value.find((f) => f.name === last?.format_name)?.id ?? matchFormats.value[0]?.id ?? ''
  form.courseId = courses.value.find((c) => c.name === last?.course_name)?.id ?? courses.value[0]?.id ?? ''
  form.teeTime = last
    ? utcToEventInput(new Date(new Date(last.tee_time).getTime() + 10 * 60000).toISOString(), selectedCourseZone.value)
    : `${tournament.value?.start_date ?? ''}T08:00`
  form.handicapped = false
  await loadTees()
  adding.value = true
}

const { isBusy, run } = useBusy()

// One tap, like the reset on the scorecard: this clears matches entered while setting up, and
// the form above re-creates one. A refusal is the only failure with something to say.
async function removeMatch(match: MatchResult) {
  await run(
    match.match_id,
    async () => {
      try {
        await scorecardApi.deleteMatch(match.match_id)
        toast.success('Match deleted')
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 409) throw err
        toast.error(err.message)
      }
    },
    { error: 'Could not delete the match. Please try again.' },
  )
}

async function submit() {
  if (!form.formatId || !form.courseId || !form.teeColorId || !form.teeTime) {
    formError.value = 'Pick a format, course, tee and tee time.'
    return
  }
  creating.value = true
  formError.value = ''
  try {
    await scorecardApi.createMatch(props.id, {
      course_id: form.courseId,
      tee_color_id: form.teeColorId,
      match_format_id: form.formatId,
      tee_time: eventInputToUtc(form.teeTime, selectedCourseZone.value),
      handicapped: form.handicapped,
    })
    adding.value = false
    await refresh()
    toast.success('Match created')
  } catch {
    formError.value = 'Could not create the match. Check the tee time and try again.'
  } finally {
    creating.value = false
  }
}

const fieldClass = 'block w-full rounded border border-mrc-line-strong bg-white px-3 py-2 text-mrc-ink shadow-sm [color-scheme:light]'
</script>
<template>
  <PageLayout :title="tournament?.name ?? 'Setup'" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <!-- The page title is `tournament?.name ?? 'Setup'`, so the header already changes
             when data lands; a collapsed body would add a second jump underneath it. -->
        <SkeletonBlock radius="md" class="h-20 w-full" />
        <div class="mt-8">
          <FullBleed>
            <div class="px-4"><SkeletonBlock class="mb-2 h-3 w-24" /><SkeletonList :rows="5" /></div>
          </FullBleed>
        </div>
      </template>
      <!-- In the order a cup is actually set up: enter the field, split it into sides,
           then put the sides into matches. -->
      <RouterLink :to="{ name: 'admin-roster', params: { id } }" class="mb-3 block transition hover:shadow-lg">
        <BaseCard>
          <div class="flex items-center justify-between">
            <div>
              <h4>Assign players</h4>
              <p class="text-sm text-mrc-muted">Enter the field, and set each player's flight, handicap and biography.</p>
            </div>
            <ChevronRightIcon class="shrink-0 text-mrc-faint" />
          </div>
        </BaseCard>
      </RouterLink>

      <RouterLink :to="{ name: 'admin-teams', params: { id } }" class="block transition hover:shadow-lg">
        <BaseCard>
          <div class="flex items-center justify-between">
            <div>
              <h4>Assign teams</h4>
              <p class="text-sm text-mrc-muted">Draft players onto Blue and Red.</p>
            </div>
            <ChevronRightIcon class="shrink-0 text-mrc-faint" />
          </div>
        </BaseCard>
      </RouterLink>

      <section class="mt-8">
        <FullBleed>
          <div class="px-4">
            <!-- One sheet in tee-time order. Grouped by day and not by format: the format is a
                 property of a match now, and a match that changes one should not leave the list. -->
            <div v-for="day in days" :key="day.key" class="mb-6">
              <CapsLabel as="h3" size="sm" class="mb-2 text-mrc-muted">{{ day.label }}</CapsLabel>
              <div class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
                <div v-for="m in day.matches" :key="m.match_id" class="flex items-stretch border-b border-mrc-line last:border-b-0">
                  <RouterLink
                    :to="{ name: 'admin-lineup', params: { id, matchId: m.match_id } }"
                    class="group flex min-w-0 flex-1 items-center justify-between px-4 py-3 transition hover:bg-mrc-panel"
                  >
                    <div class="min-w-0">
                      <p class="flex items-baseline gap-2">
                        <span class="font-semibold tabular-nums">{{ formatTeeTime(m.tee_time) }}</span>
                        <span class="truncate text-sm text-mrc-muted">{{ m.format_name }}</span>
                      </p>
                      <p class="truncate text-sm text-mrc-muted">{{ pairing(m.sides) }}</p>
                    </div>
                    <ChevronRightIcon class="shrink-0 text-mrc-faint transition group-hover:text-mrc-accent" />
                  </RouterLink>
                  <button
                    type="button"
                    :disabled="isBusy()"
                    :aria-busy="isBusy(m.match_id)"
                    :aria-label="`Delete the ${formatTeeTime(m.tee_time)} match`"
                    class="flex min-w-[44px] shrink-0 items-center justify-center border-l border-mrc-line text-mrc-muted transition hover:bg-mrc-panel-alt hover:text-mrc-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mrc-accent disabled:opacity-50"
                    @click="removeMatch(m)"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
            <p v-if="!matches.length" class="mb-3 text-mrc-muted">No matches yet. Add the first one below.</p>

            <button v-if="!adding" type="button" @click="openForm()" class="text-sm font-semibold text-mrc-accent hover:underline">
              + Add match
            </button>
            <div v-else class="space-y-3 rounded-md border border-mrc-line bg-mrc-panel p-4">
              <BaseAlert v-if="formError" variant="error">{{ formError }}</BaseAlert>
              <div>
                <BaseLabel>Format</BaseLabel>
                <select v-model="form.formatId" :class="fieldClass">
                  <option v-for="f in matchFormats" :key="f.id" :value="f.id">{{ f.name }}</option>
                </select>
              </div>
              <div>
                <BaseLabel>Course</BaseLabel>
                <select v-model="form.courseId" @change="loadTees" :class="fieldClass">
                  <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <BaseLabel>Tee</BaseLabel>
                <select v-model="form.teeColorId" :class="fieldClass" :disabled="!courseTees.length">
                  <option v-for="t in courseTees" :key="t.tee_color_id" :value="t.tee_color_id">{{ t.color }}</option>
                </select>
                <p v-if="form.courseId && !courseTees.length" class="mt-1 text-sm text-mrc-muted">This course has no tee sets set up.</p>
              </div>
              <div>
                <BaseLabel>Tee time</BaseLabel>
                <input type="datetime-local" v-model="form.teeTime" required :class="fieldClass" />
              </div>
              <label class="flex items-center gap-2 text-sm text-mrc-charcoal">
                <input type="checkbox" v-model="form.handicapped" class="[color-scheme:light]" /> Handicapped (net scoring)
              </label>
              <div class="flex gap-2 pt-1">
                <BaseButton :loading="creating" :disabled="!form.teeColorId || !form.teeTime" @click="submit()">Create match</BaseButton>
                <BaseButton variant="secondary" @click="adding = false">Cancel</BaseButton>
              </div>
            </div>
          </div>
        </FullBleed>
      </section>
    </AsyncState>
  </PageLayout>
</template>
