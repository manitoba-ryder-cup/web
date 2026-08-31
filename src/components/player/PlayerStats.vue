<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { NotableMatch, PairRecord, PlayerStats } from '@/api/types'
import { resultText } from '@/lib/matchResult'
import PointsTotal from '@/components/base/PointsTotal.vue'
import BaseAccordion from '@/components/base/BaseAccordion.vue'
import CapsLabel from '@/components/typography/CapsLabel.vue'

// Who they play well with and against is what a captain reads before setting pairings.
const props = defineProps<{ stats: PlayerStats; playerName: string }>()

const wlt = (r: { wins: number; losses: number; ties: number }) => `${r.wins}–${r.losses}–${r.ties}`

// Per cup, not a career total: everyone plays every format, so a total only says how long
// someone has been coming. The rate compares a veteran to a newcomer.
const perCup = computed(() => (props.stats.cups_played ? props.stats.points / props.stats.cups_played : 0))

// A pairing seen once says nothing — it's a coin toss, not a record. Two is the fewest
// that can show a pattern, and the list is long enough without the singletons.
const REPEATED = 2
const repeatedTeammates = computed(() => props.stats.teammates.filter((t) => t.matches >= REPEATED))
const frequentOpponents = computed(() => props.stats.opponents.filter((o) => o.matches >= REPEATED))

const name = (p: PairRecord) => `${p.first_name} ${p.last_name}`

// A partner or opponent opens from the same list this profile was opened from, so `from`
// rides along rather than resetting the back link to this year's teams.
const route = useRoute()
const profile = (id: string) => ({
  name: 'player',
  params: { id },
  ...(route.query.from ? { query: { from: route.query.from } } : {}),
})

// Through resultText, so a margin reads as it does on a scorecard. Which side won is
// implied by the row, so winner_team_id only has to be non-null.
const margin = (m: NotableMatch) =>
  resultText({ finished: true, winner_team_id: 'them', leader_team_id: 'them', lead: m.lead, holes_remaining: m.holes_remaining })

// Local state, not useHashAccordion: this page already spends its hash on the open cup.
const openSection = ref('formats')
const toggle = (id: string) => (openSection.value = openSection.value === id ? '' : id)
</script>
<template>
  <div class="space-y-6">
    <!-- Two numbers alone read as unfinished, and the profile already has a vocabulary for a few
         key figures side by side one screen up. -->
    <div class="text-center">
      <!-- Equal tracks rather than a width on each cell: both size to the longer label, where a w-*
           would be a number to keep in step with the copy. -->
      <div class="inline-grid grid-cols-2 divide-x divide-mrc-line overflow-hidden rounded border border-mrc-line">
        <div class="px-5 py-2">
          <p class="text-3xl font-bold tabular-nums">{{ perCup.toFixed(2) }}</p>
          <CapsLabel class="text-mrc-muted">Points per cup</CapsLabel>
        </div>
        <div class="px-5 py-2">
          <p class="font-bold"><PointsTotal :points="stats.points" size="sm" /></p>
          <CapsLabel class="text-mrc-muted">Career points</CapsLabel>
        </div>
      </div>
    </div>

    <div v-if="stats.by_format.length">
      <BaseAccordion :open="openSection === 'formats'" item-id="formats" @toggle="toggle('formats')">
        <template #header>
          <h5 class="uppercase tracking-wide">By format</h5>
          <p class="truncate text-sm text-mrc-muted">Record in each format played</p>
        </template>
        <div class="divide-y divide-mrc-line">
          <div v-for="f in stats.by_format" :key="f.format_name" class="flex items-center justify-between py-2">
            <span>{{ f.format_name }}</span>
            <span class="tabular-nums text-mrc-muted">{{ wlt(f.record) }}</span>
          </div>
        </div>
      </BaseAccordion>

      <BaseAccordion :open="openSection === 'clutch'" item-id="clutch" @toggle="toggle('clutch')">
        <template #header>
          <h5 class="uppercase tracking-wide">Under pressure</h5>
          <p class="truncate text-sm text-mrc-muted">Matches that went the distance against ones closed out early</p>
        </template>
        <div class="divide-y divide-mrc-line">
          <div class="flex items-center justify-between py-2">
            <span>Went to the 18th</span>
            <span class="tabular-nums text-mrc-muted">{{ wlt(stats.last_hole) }}</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span>Closed out early</span>
            <span class="tabular-nums text-mrc-muted">{{ wlt(stats.decided_early) }}</span>
          </div>
          <div v-if="stats.best_win" class="flex items-center justify-between gap-3 py-2">
            <span class="shrink-0">Biggest win</span>
            <span class="truncate text-right text-mrc-muted">
              <span class="tabular-nums">{{ margin(stats.best_win) }}</span> over {{ stats.best_win.opponents }} ·
              <span class="tabular-nums">{{ stats.best_win.year }}</span>
            </span>
          </div>
          <div v-if="stats.heaviest_loss" class="flex items-center justify-between gap-3 py-2">
            <span class="shrink-0">Heaviest defeat</span>
            <span class="truncate text-right text-mrc-muted">
              <span class="tabular-nums">{{ margin(stats.heaviest_loss) }}</span> to {{ stats.heaviest_loss.opponents }} ·
              <span class="tabular-nums">{{ stats.heaviest_loss.year }}</span>
            </span>
          </div>
        </div>
      </BaseAccordion>

      <BaseAccordion v-if="repeatedTeammates.length" :open="openSection === 'partners'" item-id="partners" @toggle="toggle('partners')">
        <template #header>
          <h5 class="uppercase tracking-wide">Partners</h5>
          <p class="truncate text-sm text-mrc-muted">Played together more than once, most-paired first</p>
        </template>
        <div class="divide-y divide-mrc-line">
          <RouterLink
            v-for="t in repeatedTeammates"
            :key="t.player_id"
            :to="profile(t.player_id)"
            class="flex items-center justify-between py-2 transition hover:text-mrc-accent"
          >
            <span class="truncate">{{ name(t) }}</span>
            <span class="shrink-0 pl-3 tabular-nums text-mrc-muted">
              <span class="text-mrc-faint">{{ t.matches }} together</span> · {{ wlt(t.record) }}
            </span>
          </RouterLink>
        </div>
      </BaseAccordion>

      <BaseAccordion v-if="frequentOpponents.length" :open="openSection === 'opponents'" item-id="opponents" @toggle="toggle('opponents')">
        <template #header>
          <h5 class="uppercase tracking-wide">Opponents</h5>
          <p class="truncate text-sm text-mrc-muted">Faced more than once, most-played first</p>
        </template>
        <div class="divide-y divide-mrc-line">
          <RouterLink
            v-for="o in frequentOpponents"
            :key="o.player_id"
            :to="profile(o.player_id)"
            class="flex items-center justify-between py-2 transition hover:text-mrc-accent"
          >
            <span class="truncate">{{ name(o) }}</span>
            <span class="shrink-0 pl-3 tabular-nums text-mrc-muted">
              <span class="text-mrc-faint">{{ o.matches }} faced</span> · {{ wlt(o.record) }}
            </span>
          </RouterLink>
        </div>
      </BaseAccordion>
    </div>

    <p v-if="!stats.by_format.length" class="text-mrc-muted">{{ playerName }} hasn't finished a match yet.</p>
  </div>
</template>
