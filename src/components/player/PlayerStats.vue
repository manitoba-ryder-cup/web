<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { PairRecord, PlayerStats } from '@/api/types'
import CapsLabel from '@/components/typography/CapsLabel.vue'

// A career read three ways: what they play well, who they play well with, and who they
// play well against. The first is for the player, the other two are what a captain looks
// at before setting pairings and matchups.
const props = defineProps<{ stats: PlayerStats; playerName: string }>()

const wlt = (r: { wins: number; losses: number; ties: number }) => `${r.wins}–${r.losses}–${r.ties}`

// Points per cup rather than a career total: everyone plays every format, so the total
// only says how long someone has been coming. The rate is what compares a veteran to a
// newcomer.
const perCup = computed(() => (props.stats.cups_played ? props.stats.points / props.stats.cups_played : 0))

// A pairing seen once says nothing — it's a coin toss, not a record. Two is the fewest
// that can show a pattern, and the list is long enough without the singletons.
const REPEATED = 2
const repeatedTeammates = computed(() => props.stats.teammates.filter((t) => t.matches >= REPEATED))
const frequentOpponents = computed(() => props.stats.opponents.filter((o) => o.matches >= REPEATED))

const name = (p: PairRecord) => `${p.first_name} ${p.last_name}`.replace(/\s+/g, ' ')
</script>
<template>
  <div class="space-y-8">
    <!-- The headline pair, in the same divided strip the hero uses for the career line:
         two numbers on their own read as unfinished, and the profile already has a
         vocabulary for "a few key figures side by side" one screen up. -->
    <div class="text-center">
      <!-- inline-grid with equal tracks rather than a fixed width on each cell: grid-cols-2
           is minmax(0,1fr) twice, so the two match each other and both size to whichever
           label is longer. A w-* would be a number to keep in step with the copy. -->
      <div class="inline-grid grid-cols-2 divide-x divide-mrc-line overflow-hidden rounded border border-mrc-line">
        <div class="px-5 py-2">
          <p class="text-3xl font-bold tabular-nums">{{ perCup.toFixed(2) }}</p>
          <CapsLabel class="text-mrc-muted">Points per cup</CapsLabel>
        </div>
        <div class="px-5 py-2">
          <p class="text-3xl font-bold tabular-nums">{{ stats.points }}</p>
          <CapsLabel class="text-mrc-muted">Career points</CapsLabel>
        </div>
      </div>
    </div>

    <section v-if="stats.by_format.length">
      <h5 class="uppercase tracking-wide">By format</h5>
      <div class="mt-2 divide-y divide-mrc-line border-y border-mrc-line">
        <div v-for="f in stats.by_format" :key="f.format_name" class="flex items-center justify-between py-2">
          <span>{{ f.format_name }}</span>
          <span class="tabular-nums text-mrc-muted">{{ wlt(f.record) }}</span>
        </div>
      </div>
    </section>

    <section v-if="repeatedTeammates.length">
      <h5 class="uppercase tracking-wide">Partners</h5>
      <p class="mt-1 text-sm text-mrc-muted">Pairings played more than once, most-paired first.</p>
      <div class="mt-2 divide-y divide-mrc-line border-y border-mrc-line">
        <RouterLink
          v-for="t in repeatedTeammates"
          :key="t.player_id"
          :to="{ name: 'player', params: { id: t.player_id } }"
          class="flex items-center justify-between py-2 transition hover:text-mrc-accent"
        >
          <span class="truncate">{{ name(t) }}</span>
          <span class="shrink-0 pl-3 tabular-nums text-mrc-muted">
            <span class="text-mrc-faint">{{ t.matches }} together</span> · {{ wlt(t.record) }}
          </span>
        </RouterLink>
      </div>
    </section>

    <section v-if="frequentOpponents.length">
      <h5 class="uppercase tracking-wide">Opponents</h5>
      <p class="mt-1 text-sm text-mrc-muted">Faced more than once, most-played first.</p>
      <div class="mt-2 divide-y divide-mrc-line border-y border-mrc-line">
        <RouterLink
          v-for="o in frequentOpponents"
          :key="o.player_id"
          :to="{ name: 'player', params: { id: o.player_id } }"
          class="flex items-center justify-between py-2 transition hover:text-mrc-accent"
        >
          <span class="truncate">{{ name(o) }}</span>
          <span class="shrink-0 pl-3 tabular-nums text-mrc-muted">
            <span class="text-mrc-faint">{{ o.matches }} faced</span> · {{ wlt(o.record) }}
          </span>
        </RouterLink>
      </div>
    </section>

    <p v-if="!stats.by_format.length" class="text-mrc-muted">{{ playerName }} hasn't finished a match yet.</p>
  </div>
</template>
