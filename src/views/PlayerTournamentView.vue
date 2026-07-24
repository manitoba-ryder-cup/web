<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import type { MatchResult } from '@/api/types'
import { useAsync } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import SectionHeader from '@/components/typography/SectionHeader.vue'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'
import TierBadge from '@/components/base/TierBadge.vue'
import MatchOverview from '@/components/tournament/MatchOverview.vue'

const props = defineProps<{ id: string; tournamentId: string }>()

// One event, seen through one player: their scouting report + flight for the cup, and the
// matches they actually played. Results carry each match's lineup (by player id), so we
// filter to this player; teams/roster give colour and the per-tournament write-up.
const { data, error, loading } = useAsync(() =>
  Promise.all([
    scorecardApi.getPlayer(props.id),
    scorecardApi.getTournament(props.tournamentId),
    scorecardApi.getTournamentTeams(props.tournamentId),
    scorecardApi.getTournamentResults(props.tournamentId),
    scorecardApi.getTournamentPlayers(props.tournamentId),
  ]))

const player = computed(() => data.value?.[0] ?? null)
const tournament = computed(() => data.value?.[1] ?? null)
const teams = computed(() => data.value?.[2] ?? [])
const results = computed(() => data.value?.[3] ?? [])
const roster = computed(() => data.value?.[4] ?? [])

const fullName = computed(() => (player.value ? `${player.value.first_name} ${player.value.last_name}` : ''))
const year = computed(() => tournament.value?.start_date.slice(0, 4) ?? '')
const entry = computed(() => roster.value.find((p) => p.player_id === props.id) ?? null)

// The player's matches, in the order results arrive (by tee time). A match belongs to the
// player when they appear on either side's lineup.
const matches = computed(() =>
  results.value.filter((m) => m.sides.some((s) => s.players.some((p) => p.player_id === props.id))))

// The team the player is on in a given match — the side that carries them.
function sideTeamId(m: MatchResult): string | null {
  return m.sides.find((s) => s.players.some((p) => p.player_id === props.id))?.team_id ?? null
}

const teamId = computed(() => entry.value?.team_id ?? matches.value.map(sideTeamId).find(Boolean) ?? null)
const team = computed(() => teams.value.find((t) => t.id === teamId.value) ?? null)
const teamName = computed(() => (team.value?.captain?.last_name ? `Team ${team.value.captain.last_name}` : ''))

// That cup's W–L–T, tallied from the player's finished matches (win = their side took it,
// tie = halved). Unfinished matches don't count yet — same rule the leaderboard uses.
const record = computed(() => {
  let wins = 0, losses = 0, ties = 0
  for (const m of matches.value) {
    if (!m.finished) continue
    if (!m.winner_team_id) ties++
    else if (m.winner_team_id === sideTeamId(m)) wins++
    else losses++
  }
  return { wins, losses, ties }
})
</script>
<template>
  <PageLayout>
    <AsyncState :loading="loading" :error="error">
      <template v-if="player && tournament">
        <!-- Compact header: the player scoped to this one cup. The event line links back up
             to the full leaderboard, so nothing is a dead end. -->
        <div class="mt-6 flex items-center gap-4">
          <PlayerAvatar :photo-path="player.photo_path" :alt="fullName" size="lg" />
          <div class="min-w-0">
            <h2 class="truncate">{{ fullName }}</h2>
            <RouterLink :to="{ name: 'tournament', params: { id: tournamentId } }"
                        class="text-mrc-muted transition hover:text-mrc-accent hover:underline">
              {{ year }}<template v-if="teamName"> · {{ teamName }}</template>
            </RouterLink>
            <p class="truncate text-sm text-mrc-muted">{{ tournament.location }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <TierBadge v-if="entry?.tier" :tier="entry.tier">{{ entry.tier }} flight</TierBadge>
              <span class="text-sm tabular-nums text-mrc-muted">Record {{ record.wins }}–{{ record.losses }}–{{ record.ties }}</span>
            </div>
          </div>
        </div>

        <BaseCard v-if="entry?.biography" class="mt-6">
          <SectionHeader>Scouting Report</SectionHeader>
          <p class="mt-3 leading-relaxed text-mrc-charcoal">{{ entry.biography }}</p>
        </BaseCard>

        <section class="mt-8">
          <SectionHeader>Matches</SectionHeader>
          <div class="mt-4">
            <div v-for="m in matches" :key="m.match_id">
              <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-mrc-muted">{{ m.format_name }}</p>
              <RouterLink :to="{ name: 'match', params: { tournamentId, matchId: m.match_id } }" class="block">
                <MatchOverview :match="m" :teams="teams" />
              </RouterLink>
            </div>
          </div>
          <p v-if="!matches.length" class="mt-3 text-mrc-muted">{{ fullName }} didn't play a match in this cup.</p>
        </section>
      </template>
      <p v-else class="mt-6 text-center text-mrc-muted">Cup not found.</p>
    </AsyncState>
  </PageLayout>
</template>
