<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavLink from './NavLink.vue'
import NavDrawer from './NavDrawer.vue'
import MenuIcon from '@/components/icons/MenuIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const drawerOpen = ref(false)

// Mirrors the old app's public IA (News is the landing, History is the tournament list).
// Players/Leaderboard return as their features get built; auth only toggles Login/Logout.
const links = [
  { to: '/', label: 'News' },
  { to: '/players', label: 'Players' },
  { to: '/tournaments', label: 'History' },
]

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
        <RouterLink to="/" class="flex items-center gap-2 text-xl font-semibold text-white">
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
      <NavLink v-for="l in links" :key="l.to" :to="l.to" variant="drawer">{{ l.label }}</NavLink>
      <button v-if="auth.isAuthenticated" class="flex w-full items-center px-4 py-2 text-left hover:bg-mrc-accent/10" @click="onLogout">Logout</button>
      <NavLink v-else to="/login" variant="drawer">Login</NavLink>
    </NavDrawer>
  </header>
</template>
