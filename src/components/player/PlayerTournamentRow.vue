<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { MatchResult, PlayerTournamentHistory, TournamentTeam } from '@/api/types'
import { scorecardApi } from '@/api/scorecard'
import TierBadge from '@/components/base/TierBadge.vue'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'
import MatchSummary from '@/components/tournament/MatchSummary.vue'
import BaseAccordion from '@/components/base/BaseAccordion.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'

// One cup in a player's history, which opens in place to show what was written about them
// that year and the matches they played. Opening is the parent's business — only one row
// is ever open, so the page can't grow into a wall of expanded years.
//
// The matches load on first open rather than with the list: eighteen cups would otherwise
// be eighteen requests on a page where most rows are never opened.
const props = defineProps<{ entry: PlayerTournamentHistory; playerId: string; open: boolean }>()
defineEmits<{ toggle: [] }>()

const year = computed(() => props.entry.start_date.slice(0, 4))
// The player's team that event, identified by its captain ("Team Macaulay").
const teamName = computed(() => (props.entry.captain_last_name ? `Team ${props.entry.captain_last_name}` : ''))
const resultLabel = computed(() => ({ won: 'Won', lost: 'Lost', tied: 'Tied', in_progress: 'In progress' })[props.entry.result] ?? '')
const resultClass = computed(() =>
  props.entry.result === 'won'
    ? 'bg-mrc-success-tint text-mrc-success-ink'
    : props.entry.result === 'lost'
      ? 'bg-mrc-red-line text-mrc-red-strong'
      : 'bg-mrc-panel text-mrc-muted',
)

const matches = ref<MatchResult[]>([])
const teams = ref<TournamentTeam[]>([])
const loadingMatches = ref(false)
let loaded = false

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen || loaded) return
    loaded = true
    loadingMatches.value = true
    try {
      const [results, t] = await Promise.all([
        scorecardApi.getTournamentResults(props.entry.tournament_id),
        scorecardApi.getTournamentTeams(props.entry.tournament_id),
      ])
      matches.value = results.filter((m) => m.sides.some((s) => s.players.some((p) => p.player_id === props.playerId)))
      teams.value = t
    } catch {
      // The row still shows the write-up; a failed match load shouldn't blank it.
      loaded = false
    } finally {
      loadingMatches.value = false
    }
  },
)
</script>
<template>
  <BaseAccordion :open="open" :item-id="entry.tournament_id" @toggle="$emit('toggle')">
    <template #header>
      <div class="flex items-center gap-2">
        <TierBadge :tier="entry.tier" />
        <span class="truncate text-lg font-semibold"
          >{{ year }}<template v-if="teamName"> · {{ teamName }}</template></span
        >
      </div>
      <p class="truncate text-sm text-mrc-muted">{{ entry.location }}</p>
    </template>

    <template #meta>
      <span class="text-sm tabular-nums text-mrc-muted"> {{ entry.record.wins }}–{{ entry.record.losses }}–{{ entry.record.ties }} </span>
      <span class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide" :class="resultClass">
        {{ resultLabel }}
      </span>
    </template>

    <CapsLabel as="h5" size="sm">Biography</CapsLabel>
    <p v-if="entry.biography" class="mt-2 max-w-prose whitespace-pre-line leading-relaxed text-mrc-charcoal">
      {{ entry.biography }}
    </p>
    <p v-else class="mt-2 text-sm text-mrc-muted">No biography was written this year.</p>

    <CapsLabel as="h5" size="sm" class="mt-6">Matches</CapsLabel>
    <!-- Summary rows rather than full scorecards: the result and the pairing is what you
         want reading down a career. Tapping one opens the hole-by-hole. -->
    <div v-if="matches.length">
      <div v-for="m in matches" :key="m.match_id">
        <CapsLabel class="mb-1 mt-3 text-center text-mrc-muted">{{ m.format_name }}</CapsLabel>
        <RouterLink :to="{ name: 'match', params: { tournamentId: entry.tournament_id, matchId: m.match_id } }" class="block">
          <MatchSummary :match="m" :teams="teams" />
        </RouterLink>
      </div>
    </div>
    <div v-else-if="loadingMatches" data-testid="skeleton">
      <span class="sr-only" role="status">Loading matches…</span>
      <div v-for="n in 3" :key="n">
        <SkeletonBlock class="mx-auto mb-1 mt-3 h-3 w-24" />
        <SkeletonBlock radius="md" class="h-14 w-full" />
      </div>
    </div>
    <p v-else class="mt-2 text-sm text-mrc-muted">No matches recorded for this cup.</p>
  </BaseAccordion>
</template>
