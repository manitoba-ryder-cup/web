<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCupStore } from '@/stores/cup'
import { navSection, type NavSection } from '@/lib/navSection'
import NavLink from './NavLink.vue'
import AccountMenu from './AccountMenu.vue'
import ArrowLeftIcon from '@/components/icons/ArrowLeftIcon.vue'

// The back link is derived from the current route's meta (declared in the router), so it's
// a pure function of the route and never lingers across navigations. It replaces the
// wordmark; the account menu stays.
const route = useRoute()
const back = computed(() => route.meta.back?.(route) ?? null)

const cup = useCupStore()
cup.load().catch(() => {})
const scoresTo = computed(() => cup.scoresTo)

// Only shown from md up, where there is no tab bar. Same destinations and the same
// navSection rule the bar uses, so the two cannot disagree about where the app goes or
// about which screen you are on.
const section = computed(() => navSection(route))
const links = computed((): { to: string; label: string; section: NavSection }[] => [
  // Home is here and not left to the wordmark: a detail page replaces the wordmark with
  // its back link, so without this the only way home from a profile is to leave it first.
  { to: '/', label: 'Home', section: 'home' },
  { to: scoresTo.value, label: 'Scores', section: 'scores' },
  { to: '/teams', label: 'Teams', section: 'teams' },
  { to: '/tournaments', label: 'History', section: 'history' },
])
</script>
<template>
  <header class="bg-mrc-ink text-white">
    <div class="mx-auto w-full max-w-3xl md:max-w-4xl lg:max-w-5xl">
      <div class="flex h-16 items-center justify-between">
        <!-- A detail page's back link replaces the logo/wordmark only; what sits on the
             right stays put. -->
        <RouterLink v-if="back" :to="back.to" class="flex items-center gap-1 pl-2 text-xl font-semibold text-white">
          <ArrowLeftIcon /><span class="ml-3">{{ back.label }}</span>
        </RouterLink>
        <RouterLink v-else to="/" class="flex items-center gap-2 text-xl font-semibold text-white">
          <img src="/img/logo.webp" alt="MRC logo" class="h-12 w-12 object-contain" />
          <span>Manitoba Ryder Cup</span>
        </RouterLink>

        <div class="flex items-center">
          <nav class="mr-2 hidden items-center gap-5 text-sm md:flex">
            <NavLink v-for="l in links" :key="l.label" :to="l.to" :active="l.section === section">{{ l.label }}</NavLink>
          </nav>
          <AccountMenu />
        </div>
      </div>
    </div>
  </header>
</template>
