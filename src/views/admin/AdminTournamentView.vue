<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import { type MatchResult } from '@/api/types'
import { q } from '@/api/queries'
import { combine, useResource } from '@/composables/useAsync'
import { toast } from '@/composables/useToast'
import { useAfterMatchDelete } from '@/composables/useAfterWrite'
import { useBusy } from '@/composables/useBusy'
import { useCourseTees } from '@/composables/useCourseTees'
import { isStatus } from '@/lib/apiError'
import { displayError } from '@/lib/displayError'
import { playerSurnames } from '@/lib/matchResult'
import { CUP_TIME_ZONE, formatTeeTime, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'
import TrashIcon from '@/components/icons/TrashIcon.vue'

const props = defineProps<{ id: string }>()

// Results carry each match's sides + tee time (for the list); match-formats map a format
// name to its id (for creating); courses feed the add-match picker.
const tournamentRes = useResource(() => q.tournament(props.id))
const matchesRes = useResource(() => q.results(props.id))
const formatsRes = useResource(() => q.matchFormats())
const coursesRes = useResource(() => q.courses())
const { error, loading, retry } = combine([tournamentRes, matchesRes, formatsRes, coursesRes])
const refresh = retry
const tournament = computed(() => tournamentRes.data.value ?? null)
const matches = computed(() => matchesRes.data.value ?? [])
const matchFormats = computed(() => formatsRes.data.value ?? [])
const courses = computed(() => coursesRes.data.value ?? [])

// Rounds are set one at a time over the event, so a tab per format keeps you on the round you
// are setting. Within one, the tee time is what tells unassigned matches apart.
const formats = computed(() => {
  const seen: string[] = []
  for (const m of matches.value) if (!seen.includes(m.format_name)) seen.push(m.format_name)
  return seen
})
const byFormat = computed(() => {
  const rank = (m: MatchResult) => m.tee_time
  const map: Record<string, MatchResult[]> = {}
  for (const f of formats.value) {
    map[f] = matches.value.filter((m) => m.format_name === f).sort((a, b) => rank(a).localeCompare(rank(b)))
  }
  return map
})

// A short "Bale/Phin vs Fordyce/Ray" for each match, or a hint when a side is empty.
function pairing(sides: { players: { player_id: string; first_name: string; last_name: string }[] }[]): string {
  const label = (i: number) => (sides[i]?.players.length ? playerSurnames(sides[i].players) : 'Not set')
  return `${label(0)} vs ${label(1)}`
}

// --- Add match ---
// The form lives under whichever format tab it was opened from (adding === that format).
const adding = ref<string | null>(null)
const creating = ref(false)
const formError = ref('')
const {
  tees: courseTees,
  failed: teesFailed,
  loading: teesLoading,
  selected: teeColorId,
  load: loadTees,
  retry: retryTees,
} = useCourseTees()
const form = reactive({ courseId: '', teeTime: '', handicapped: false })
// A tee time is typed as the wall clock the tee sheet says; the course it is played at is
// what turns that into an instant.
const selectedCourseZone = computed(() => courses.value.find((c) => c.id === form.courseId)?.time_zone ?? CUP_TIME_ZONE)

function openForm(format: string) {
  formError.value = ''
  const siblings = byFormat.value[format] ?? []
  // Default the tee time to 10 minutes after the round's latest match (the next slot), or
  // the tournament's first morning when the round is empty.
  const latest = siblings
    .map((m) => m.tee_time)
    .sort()
    .pop()
  form.teeTime = latest
    ? utcToEventInput(new Date(new Date(latest).getTime() + 10 * 60000).toISOString(), selectedCourseZone.value)
    : `${tournament.value?.start_date ?? ''}T08:00`
  // Default the course to the one this round already uses (matched by name), else the first.
  const usedName = siblings.find((m) => m.course_name)?.course_name
  form.courseId = courses.value.find((c) => c.name === usedName)?.id ?? courses.value[0]?.id ?? ''
  form.handicapped = false
  loadTees(form.courseId)
  adding.value = format
}

const afterMatchDelete = useAfterMatchDelete()
const { isBusy, run } = useBusy()

// One tap, like the reset on the scorecard: this clears matches entered while setting up, and
// the form above re-creates one. A refusal is the only failure with something to say.
async function removeMatch(match: MatchResult) {
  await run(
    match.match_id,
    async () => {
      try {
        await scorecardApi.deleteMatch(match.match_id)
        // Only here, unlike a save: a refused delete leaves the match where it was, and its
        // copies are still the truth.
        afterMatchDelete(props.id, match.match_id)
        toast.success('Match deleted')
      } catch (err) {
        if (!isStatus(err, 409)) throw err
        toast.error(displayError(err))
      }
    },
    { error: 'Could not delete the match. Please try again.' },
  )
}

async function submit(format: string) {
  const formatId = matchFormats.value.find((f) => f.name === format)?.id
  if (!formatId || !form.courseId || !teeColorId.value || !form.teeTime) {
    formError.value = 'Pick a course, tee and tee time.'
    return
  }
  creating.value = true
  formError.value = ''
  try {
    await scorecardApi.createMatch(props.id, {
      course_id: form.courseId,
      tee_color_id: teeColorId.value,
      match_format_id: formatId,
      tee_time: eventInputToUtc(form.teeTime, selectedCourseZone.value),
      handicapped: form.handicapped,
    })
    adding.value = null
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
            <SkeletonTabs />
            <div class="px-4 pt-6"><SkeletonList :rows="5" /></div>
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
        <!-- The active format is mirrored in the hash, so you return to the round you were setting. -->
        <FullBleed v-if="formats.length">
          <BaseTabs :tabs="formats" v-slot="{ tab }">
            <div class="px-4">
              <div class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
                <div v-for="m in byFormat[tab]" :key="m.match_id" class="flex items-stretch border-b border-mrc-line last:border-b-0">
                  <RouterLink
                    :to="{ name: 'admin-lineup', params: { id, matchId: m.match_id } }"
                    class="group flex min-w-0 flex-1 items-center justify-between px-4 py-3 transition hover:bg-mrc-panel"
                  >
                    <div class="min-w-0">
                      <p class="font-semibold tabular-nums">{{ formatTeeTime(m.tee_time) }}</p>
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

              <!-- Add another match to this round. Course/tee default to what the round uses; the
                   tee time defaults to the next slot. -->
              <button
                v-if="adding !== tab"
                type="button"
                @click="openForm(tab)"
                class="mt-3 text-sm font-semibold text-mrc-accent hover:underline"
              >
                + Add {{ tab }} match
              </button>
              <div v-else class="mt-3 space-y-3 rounded-md border border-mrc-line bg-mrc-panel p-4">
                <BaseAlert v-if="formError" variant="error">{{ formError }}</BaseAlert>
                <div>
                  <BaseLabel>Course</BaseLabel>
                  <select v-model="form.courseId" @change="loadTees(form.courseId)" :class="fieldClass">
                    <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <BaseLabel>Tee</BaseLabel>
                  <select v-model="teeColorId" :class="fieldClass" :disabled="!courseTees.length">
                    <option v-for="t in courseTees" :key="t.tee_color_id" :value="t.tee_color_id">{{ t.color }}</option>
                  </select>
                  <template v-if="teesFailed">
                    <p class="mt-1 text-sm text-mrc-charcoal">Couldn't load this course's tees.</p>
                    <button
                      type="button"
                      class="mt-2 w-full rounded-md bg-mrc-accent py-2 font-semibold text-white transition hover:bg-mrc-accent-dark"
                      @click="retryTees"
                    >
                      Try again
                    </button>
                  </template>
                  <p v-else-if="form.courseId && !teesLoading && !courseTees.length" class="mt-1 text-sm text-mrc-muted">
                    This course has no tee sets set up.
                  </p>
                </div>
                <div>
                  <BaseLabel>Tee time</BaseLabel>
                  <input type="datetime-local" v-model="form.teeTime" required :class="fieldClass" />
                </div>
                <label class="flex items-center gap-2 text-sm text-mrc-charcoal">
                  <input type="checkbox" v-model="form.handicapped" class="[color-scheme:light]" /> Handicapped (net scoring)
                </label>
                <div class="flex gap-2 pt-1">
                  <BaseButton :loading="creating" :disabled="!teeColorId || !form.teeTime" @click="submit(tab)">Create match</BaseButton>
                  <BaseButton variant="secondary" @click="adding = null">Cancel</BaseButton>
                </div>
              </div>
            </div>
          </BaseTabs>
        </FullBleed>
        <p v-else class="text-mrc-muted">No matches have been created for this tournament yet.</p>
      </section>
    </AsyncState>
  </PageLayout>
</template>
