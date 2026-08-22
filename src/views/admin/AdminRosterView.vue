<script setup lang="ts">
import { ref, computed } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { TournamentPlayer } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import { useBusy } from '@/composables/useBusy'
import { useAfterWrite } from '@/composables/useAfterWrite'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import BaseAccordion from '@/components/base/BaseAccordion.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseLabel from '@/components/base/BaseLabel.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import TierDot from '@/components/base/TierDot.vue'
import FullBleed from '@/components/layout/FullBleed.vue'

// Tier, biography and handicap live on the entry, not the player — a different flight and
// write-up each cup — so this is the only place they can be edited.
const props = defineProps<{ id: string }>()

const { data, error, loading, refresh, retry } = useAsync(
  () => ['admin', 'roster', props.id],
  async () => {
    const [roster, players] = await Promise.all([scorecardApi.getTournamentPlayers(props.id), scorecardApi.listPlayers()])
    return { roster, players }
  },
)

const byName = (a: { last_name: string; first_name: string }, b: { last_name: string; first_name: string }) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)

const roster = computed(() => [...(data.value?.roster ?? [])].sort(byName))

// Anyone not already entered. Entering the same player twice is a 409, so offering them
// would only produce an error someone has to read.
const available = computed(() => {
  const entered = new Set(roster.value.map((p) => p.player_id))
  return [...(data.value?.players ?? [])].filter((p) => !entered.has(p.id)).sort(byName)
})

// `silver` is in the palette but unused, so it sits last rather than being dropped: a cup
// that wants it should not need a code change.
const TIERS = ['gold', 'blue', 'white', 'black', 'silver']

const { isBusy, run } = useBusy()
const afterWrite = useAfterWrite()

const openId = ref('')
const toggle = (playerId: string) => (openId.value = openId.value === playerId ? '' : playerId)

// One draft per open row. Keyed by player so switching rows can't carry an edit across.
const draft = ref<{ tier: string; biography: string; hdcp: string }>({ tier: '', biography: '', hdcp: '' })

function open(entry: TournamentPlayer) {
  toggle(entry.player_id)
  if (openId.value !== entry.player_id) return
  draft.value = { tier: entry.tier, biography: entry.biography, hdcp: String(entry.hdcp) }
}

// Partial precisely so a biography can be written without restating a handicap the writer may
// not know — sending the whole entry back would give it away.
function changes(entry: TournamentPlayer) {
  const out: { tier?: string; biography?: string; hdcp?: number } = {}
  if (draft.value.tier !== entry.tier) out.tier = draft.value.tier
  if (draft.value.biography !== entry.biography) out.biography = draft.value.biography
  const hdcp = Number(draft.value.hdcp)
  if (draft.value.hdcp !== '' && !Number.isNaN(hdcp) && hdcp !== entry.hdcp) out.hdcp = hdcp
  return out
}

const dirty = computed(() => (entry: TournamentPlayer) => Object.keys(changes(entry)).length > 0)

const save = (entry: TournamentPlayer) =>
  run(
    entry.player_id,
    async () => {
      await scorecardApi.updateTournamentPlayer(props.id, entry.player_id, changes(entry))
      await afterWrite()
      await refresh()
      openId.value = ''
    },
    { error: "Couldn't save that player. Please try again." },
  )

const adding = ref('')
const enter = () =>
  run(
    'enter',
    async () => {
      await scorecardApi.enterTournamentPlayer(props.id, { player_id: adding.value })
      adding.value = ''
      await refresh()
    },
    { error: "Couldn't enter that player. Please try again." },
  )

const fieldClass = 'block w-full rounded border border-mrc-line-strong bg-white px-3 py-2 text-mrc-ink shadow-sm [color-scheme:light]'
</script>
<template>
  <PageLayout title="Assign Players" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <template #loading>
        <SkeletonBlock class="mb-4 h-10 w-full" />
        <SkeletonList :rows="8" />
      </template>

      <!-- Entering the field comes first: nothing else on this page does anything until
           somebody is in it. -->
      <form class="mb-6 flex items-end gap-2" @submit.prevent="enter">
        <div class="flex-1">
          <BaseLabel for="add-player">Enter a player</BaseLabel>
          <select id="add-player" v-model="adding" :class="fieldClass" :disabled="!available.length">
            <option value="">{{ available.length ? 'Choose a player…' : 'Everyone is entered' }}</option>
            <option v-for="p in available" :key="p.id" :value="p.id">{{ p.first_name }} {{ p.last_name }}</option>
          </select>
        </div>
        <BaseButton type="submit" :loading="isBusy('enter')" :disabled="!adding">Enter</BaseButton>
      </form>

      <BaseAlert v-if="!roster.length" variant="info">No players are entered in this cup yet.</BaseAlert>

      <!-- Full-bleed so a row's divider spans the page, matching the player history. -->
      <FullBleed v-else>
        <div class="px-4">
          <p class="mb-2 text-sm text-mrc-muted">{{ roster.length }} entered</p>
          <BaseAccordion
            v-for="entry in roster"
            :key="entry.player_id"
            :open="openId === entry.player_id"
            :item-id="entry.player_id"
            @toggle="open(entry)"
          >
            <template #header>
              <div class="flex min-w-0 items-center gap-2">
                <TierDot :tier="entry.tier" />
                <span class="truncate font-semibold">{{ entry.first_name }} {{ entry.last_name }}</span>
              </div>
              <p class="truncate text-sm text-mrc-muted">
                {{ entry.biography ? 'Biography written' : 'No biography yet' }}
              </p>
            </template>

            <template #meta>
              <span class="text-sm tabular-nums text-mrc-muted">{{ entry.hdcp }}</span>
            </template>

            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <BaseLabel :for="`tier-${entry.player_id}`">Flight</BaseLabel>
                <select :id="`tier-${entry.player_id}`" v-model="draft.tier" :class="fieldClass">
                  <option v-for="t in TIERS" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <BaseLabel :for="`hdcp-${entry.player_id}`">Handicap</BaseLabel>
                <BaseInput :id="`hdcp-${entry.player_id}`" v-model="draft.hdcp" type="number" step="0.1" />
              </div>
            </div>

            <BaseLabel :for="`bio-${entry.player_id}`" class="mt-3">Biography</BaseLabel>
            <textarea :id="`bio-${entry.player_id}`" v-model="draft.biography" rows="5" :class="fieldClass" />

            <div class="mt-3 flex justify-end">
              <BaseButton :loading="isBusy(entry.player_id)" :disabled="!dirty(entry)" @click="save(entry)">Save</BaseButton>
            </div>
          </BaseAccordion>
        </div>
      </FullBleed>
    </AsyncState>
  </PageLayout>
</template>
