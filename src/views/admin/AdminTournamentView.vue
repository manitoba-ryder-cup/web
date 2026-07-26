<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { MatchResult, TeeSetSummary } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { toast } from '@/composables/useToast'
import { playerSurnames } from '@/lib/matchResult'
import { formatTeeTime, utcToEventInput, eventInputToUtc } from '@/lib/teeTime'
import PageLayout from '@/components/layout/PageLayout.vue'
import FullBleed from '@/components/layout/FullBleed.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseTabs from '@/components/base/BaseTabs.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import ChevronRightIcon from '@/components/icons/ChevronRightIcon.vue'

const props = defineProps<{ id: string }>()

// Results carry each match's sides + tee time (for the list); match-formats map a format
// name to its id (for creating); courses feed the add-match picker.
const { data, error, loading, refresh } = useAsync(async () => {
  const [tournament, matches, matchFormats, courses] = await Promise.all([
    scorecardApi.getTournament(props.id),
    scorecardApi.getTournamentResults(props.id),
    scorecardApi.listMatchFormats(),
    scorecardApi.listCourses(),
  ])
  return { tournament, matches, matchFormats, courses }
})
const tournament = computed(() => data.value?.tournament ?? null)
const matches = computed(() => data.value?.matches ?? [])
const matchFormats = computed(() => data.value?.matchFormats ?? [])
const courses = computed(() => data.value?.courses ?? [])

// Matches split by format — one tab per round. Rounds are set one at a time over the event
// (Fourball at the draft, Alt Shot at lunch, Scotch that evening, Singles after), so a tab
// per format keeps you on exactly the round you're setting. Within a format the tee time is
// what tells the matches apart, so an unassigned match is identifiable before any players.
const formats = computed(() => {
  const seen: string[] = []
  for (const m of matches.value) if (!seen.includes(m.format_name)) seen.push(m.format_name)
  return seen
})
const byFormat = computed(() => {
  const rank = (m: MatchResult) => m.tee_time ?? '~' // unscheduled sorts last
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
const courseTees = ref<TeeSetSummary[]>([])
const form = reactive({ courseId: '', teeColorId: '', teeTime: '', handicapped: false })

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

async function openForm(format: string) {
  formError.value = ''
  const siblings = byFormat.value[format] ?? []
  // Default the tee time to 10 minutes after the round's latest match (the next slot), or
  // the tournament's first morning when the round is empty.
  const latest = siblings.map((m) => m.tee_time).filter(Boolean).sort().pop() as string | undefined
  form.teeTime = latest
    ? utcToEventInput(new Date(new Date(latest).getTime() + 10 * 60000).toISOString())
    : `${tournament.value?.start_date ?? ''}T08:00`
  // Default the course to the one this round already uses (matched by name), else the first.
  const usedName = siblings.find((m) => m.course_name)?.course_name
  form.courseId = courses.value.find((c) => c.name === usedName)?.id ?? courses.value[0]?.id ?? ''
  form.handicapped = false
  await loadTees()
  adding.value = format
}

async function submit(format: string) {
  const formatId = matchFormats.value.find((f) => f.name === format)?.id
  if (!formatId || !form.courseId || !form.teeColorId) {
    formError.value = 'Pick a course and tee.'
    return
  }
  creating.value = true
  formError.value = ''
  try {
    await scorecardApi.createMatch(props.id, {
      course_id: form.courseId,
      tee_color_id: form.teeColorId,
      match_format_id: formatId,
      tee_time: form.teeTime ? eventInputToUtc(form.teeTime) : null,
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
    <AsyncState :loading="loading" :error="error">
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
        <!-- Match lineups by round. One tab per format; each row is a match, led by its tee
             time. The active format is mirrored in the URL hash, so you return to the round
             you were setting. Full-bleed so the tab bar spans the page; rows padded back in. -->
        <FullBleed v-if="formats.length">
          <BaseTabs :tabs="formats" v-slot="{ tab }">
            <div class="px-4">
              <div class="overflow-hidden rounded-md border border-mrc-line bg-mrc-surface shadow">
                <RouterLink v-for="m in byFormat[tab]" :key="m.match_id"
                            :to="{ name: 'admin-lineup', params: { id, matchId: m.match_id } }"
                            class="group flex items-center justify-between border-b border-mrc-line px-4 py-3 transition last:border-b-0 hover:bg-mrc-panel">
                  <div class="min-w-0">
                    <p class="font-semibold tabular-nums">{{ formatTeeTime(m.tee_time) || 'Tee time TBD' }}</p>
                    <p class="truncate text-sm text-mrc-muted">{{ pairing(m.sides) }}</p>
                  </div>
                  <ChevronRightIcon class="shrink-0 text-mrc-faint transition group-hover:text-mrc-accent" />
                </RouterLink>
              </div>

              <!-- Add another match to this round. Course/tee default to what the round uses; the
                   tee time defaults to the next slot. -->
              <button v-if="adding !== tab" type="button" @click="openForm(tab)"
                      class="mt-3 text-sm font-semibold text-mrc-accent hover:underline">+ Add {{ tab }} match</button>
              <div v-else class="mt-3 space-y-3 rounded-md border border-mrc-line bg-mrc-panel p-4">
                <BaseAlert v-if="formError" variant="error">{{ formError }}</BaseAlert>
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
                  <input type="datetime-local" v-model="form.teeTime" :class="fieldClass" />
                </div>
                <label class="flex items-center gap-2 text-sm text-mrc-charcoal">
                  <input type="checkbox" v-model="form.handicapped" class="[color-scheme:light]" /> Handicapped (net scoring)
                </label>
                <div class="flex gap-2 pt-1">
                  <BaseButton :loading="creating" :disabled="!form.teeColorId" @click="submit(tab)">Create match</BaseButton>
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
