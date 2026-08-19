<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { scorecardApi } from '@/api/scorecard'
import NavLink from './NavLink.vue'
import NavDrawer from './NavDrawer.vue'
import MenuIcon from '@/components/icons/MenuIcon.vue'
import ArrowLeftIcon from '@/components/icons/ArrowLeftIcon.vue'
import NewspaperIcon from '@/components/icons/NewspaperIcon.vue'
import LeaderboardIcon from '@/components/icons/LeaderboardIcon.vue'
import GroupsIcon from '@/components/icons/GroupsIcon.vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'
import LoginIcon from '@/components/icons/LoginIcon.vue'
import AdminIcon from '@/components/icons/AdminIcon.vue'
import { SCOPE_TOURNAMENTS_WRITE } from '@/api/scopes'

const auth = useAuthStore()
const router = useRouter()
const drawerOpen = ref(false)
// The back link is derived from the current route's meta (declared in the router), so it's
// a pure function of the route and never lingers across navigations. It replaces the
// wordmark; the nav + hamburger stay.
const route = useRoute()
const back = computed(() => route.meta.back?.(route) ?? null)

// Inline (desktop) nav mirrors the public IA; the drawer below carries the full v2 menu.
const links = [
  { to: '/news', label: 'News' },
  { to: '/players', label: 'Players' },
  { to: '/tournaments', label: 'History' },
]

// Leaderboard jumps to the most recent tournament. Reads are public (like every other
// view in the app), so this resolves on mount regardless of auth — gating it behind login
// left the link pointing at the history list for signed-out visitors.
const latestTournamentId = ref<string | null>(null)
onMounted(async () => {
  try {
    const ts = await scorecardApi.listTournaments()
    latestTournamentId.value = [...ts].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]?.id ?? null
  } catch {
    // Nav degrades gracefully — Leaderboard keeps the list fallback.
  }
})
const leaderboardTo = computed(() => (latestTournamentId.value ? `/tournaments/${latestTournamentId.value}` : '/tournaments'))

async function onLogout() {
  drawerOpen.value = false
  await auth.logout()
  router.push('/')
}
</script>
<template>
  <header class="bg-mrc-ink text-white">
    <div class="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
      <div class="flex h-16 items-center justify-between">
        <!-- A detail page's back link replaces the logo/wordmark only; the nav + hamburger
             stay put, matching the v2 site (back arrow on the left, menu still on the right). -->
        <RouterLink v-if="back" :to="back.to" class="flex items-center gap-1 pl-2 text-xl font-semibold text-white">
          <ArrowLeftIcon /><span class="ml-3">{{ back.label }}</span>
        </RouterLink>
        <RouterLink v-else to="/" class="flex items-center gap-2 text-xl font-semibold text-white">
          <img src="/img/logo.webp" alt="MRC logo" class="h-12 w-12 object-contain" />
          <span>Manitoba Ryder Cup</span>
        </RouterLink>

        <nav class="hidden items-center gap-5 text-sm md:flex">
          <NavLink v-for="l in links" :key="l.to" :to="l.to" variant="inline">{{ l.label }}</NavLink>
          <button v-if="auth.isAuthenticated" class="text-white/80 hover:text-white" @click="onLogout">Logout</button>
          <NavLink v-else to="/login" variant="inline">Login</NavLink>
        </nav>

        <button type="button" class="text-white md:hidden mr-3" aria-label="Open menu" @click="drawerOpen = true">
          <MenuIcon />
        </button>
      </div>
    </div>

    <NavDrawer :open="drawerOpen" @close="drawerOpen = false">
      <NavLink to="/news" variant="drawer"><NewspaperIcon class="mr-4" />News &amp; Media</NavLink>
      <NavLink :to="leaderboardTo" variant="drawer"><LeaderboardIcon class="mr-4" />Leaderboard</NavLink>
      <NavLink to="/players" variant="drawer"><GroupsIcon class="mr-4" />Players</NavLink>
      <NavLink to="/tournaments" variant="drawer"><TrophyIcon class="mr-4" />History</NavLink>

      <div class="mb-1 mt-4 border-b border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-mrc-faint">Account</div>
      <template v-if="auth.isAuthenticated">
        <NavLink v-if="auth.hasScope(SCOPE_TOURNAMENTS_WRITE)" to="/admin" variant="drawer"><AdminIcon class="mr-4" />Admin</NavLink>
        <button type="button" class="flex w-full items-center px-4 py-2 text-left hover:bg-mrc-accent/10" @click="onLogout">
          <LoginIcon class="mr-4" />Logout
        </button>
      </template>
      <NavLink v-else to="/login" variant="drawer"><LoginIcon class="mr-4" />Login</NavLink>
    </NavDrawer>
  </header>
</template>
