<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useScoresLink } from '@/composables/useScoresLink'
import HomeIcon from '@/components/icons/HomeIcon.vue'
import ScoresIcon from '@/components/icons/ScoresIcon.vue'
import GroupsIcon from '@/components/icons/GroupsIcon.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'

const route = useRoute()
const scoresTo = useScoresLink()

// Each tab owns its own active rule rather than leaning on RouterLink's isActive, which
// only lights a tab on the exact route it points at: drilling from the scores into a
// match would blank the bar, and there'd be no way to say that a match still belongs to
// Scores. Home and History are exact for the opposite reason — every path sits under
// `/`, and a tournament sits under `/tournaments`, so a prefix test lights two at once.
const tabs = computed(() => [
  { to: '/', label: 'Home', icon: HomeIcon, active: (p: string) => p === '/' },
  {
    to: scoresTo.value,
    label: 'Scores',
    icon: ScoresIcon,
    active: (p: string) => /^\/tournaments\/[^/]/.test(p),
  },
  { to: '/teams', label: 'Teams', icon: GroupsIcon, active: (p: string) => /^\/(teams|players)(\/|$)/.test(p) },
  { to: '/tournaments', label: 'History', icon: TrophyIcon, active: (p: string) => p === '/tournaments' },
])

// Resolved once here rather than three times per tab in the template, where the same
// question drives the label, the colour and the pill.
const resolved = computed(() => tabs.value.map((t) => ({ ...t, isActive: t.active(route.path) })))
</script>
<template>
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-mrc-ink text-white md:hidden" aria-label="Primary">
    <ul class="flex">
      <li v-for="t in resolved" :key="t.label" class="flex-1">
        <RouterLink :to="t.to" custom v-slot="{ href, navigate }">
          <a
            :href="href"
            @click="navigate"
            :aria-current="t.isActive ? 'page' : undefined"
            class="flex flex-col items-center gap-1 py-2"
            :class="t.isActive ? 'text-mrc-accent-soft' : 'text-white/70'"
          >
            <!-- The pill is the cue that survives without colour: it is there or it is
                 not, rather than one hue against another. -->
            <span class="flex h-10 w-16 items-center justify-center rounded-full" :class="t.isActive ? 'bg-mrc-accent/40' : ''">
              <component :is="t.icon" />
            </span>
            <span class="text-sm">{{ t.label }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
