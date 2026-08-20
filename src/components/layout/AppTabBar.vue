<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useLeaderboardLink } from '@/composables/useLeaderboardLink'
import HomeIcon from '@/components/icons/HomeIcon.vue'
import LeaderboardIcon from '@/components/icons/LeaderboardIcon.vue'
import GroupsIcon from '@/components/icons/GroupsIcon.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'

const route = useRoute()
const leaderboardTo = useLeaderboardLink()

// Each tab owns its own active rule rather than leaning on RouterLink's isActive, which
// only lights a tab on the exact route it points at: drilling from the leaderboard into a
// match would blank the bar, and there'd be no way to say that a match still belongs to
// Leaderboard. Home and History are exact for the opposite reason — every path sits under
// `/`, and a tournament sits under `/tournaments`, so a prefix test lights two at once.
const tabs = computed(() => [
  { to: '/', label: 'Home', icon: HomeIcon, active: (p: string) => p === '/' },
  {
    to: leaderboardTo.value,
    label: 'Leaderboard',
    icon: LeaderboardIcon,
    active: (p: string) => /^\/tournaments\/[^/]/.test(p),
  },
  { to: '/players', label: 'Players', icon: GroupsIcon, active: (p: string) => /^\/players(\/|$)/.test(p) },
  { to: '/tournaments', label: 'History', icon: TrophyIcon, active: (p: string) => p === '/tournaments' },
])
</script>
<template>
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-mrc-ink text-white md:hidden" aria-label="Primary">
    <ul class="flex">
      <li v-for="t in tabs" :key="t.label" class="flex-1">
        <RouterLink :to="t.to" custom v-slot="{ href, navigate }">
          <a
            :href="href"
            @click="navigate"
            :aria-current="t.active(route.path) ? 'page' : undefined"
            class="relative flex flex-col items-center gap-1 py-2"
            :class="t.active(route.path) ? 'text-mrc-accent-soft' : 'text-white/70'"
          >
            <!-- Colour alone would be the only thing separating the current tab from the
                 rest, which is nothing to anyone who cannot see the difference. -->
            <span v-if="t.active(route.path)" class="absolute inset-x-3 top-0 h-0.5 rounded-b bg-mrc-accent-soft" />
            <component :is="t.icon" />
            <span class="text-[0.625rem]">{{ t.label }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
