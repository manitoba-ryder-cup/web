<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useScoresLink } from '@/composables/useScoresLink'
import NavLink from './NavLink.vue'
import AccountMenu from './AccountMenu.vue'
import ArrowLeftIcon from '@/components/icons/ArrowLeftIcon.vue'

// The back link is derived from the current route's meta (declared in the router), so it's
// a pure function of the route and never lingers across navigations. It replaces the
// wordmark; the account menu stays.
const route = useRoute()
const back = computed(() => route.meta.back?.(route) ?? null)

const scoresTo = useScoresLink()

// Only shown from md up, where there is no tab bar. Same destinations, so the two cannot
// disagree about where the app goes.
const links = computed(() => [
  { to: scoresTo.value, label: 'Scores' },
  { to: '/players', label: 'Players' },
  { to: '/tournaments', label: 'History' },
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
            <NavLink v-for="l in links" :key="l.to" :to="l.to">{{ l.label }}</NavLink>
          </nav>
          <AccountMenu />
        </div>
      </div>
    </div>
  </header>
</template>
