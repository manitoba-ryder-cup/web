<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppTabBar from './AppTabBar.vue'
import AppToasts from '@/components/base/AppToasts.vue'

const route = useRoute()
const showNav = computed(() => !route.meta.hidesNav)
</script>
<template>
  <!-- dvh, not vh: a phone's address bar makes 100vh taller than the screen, so a page that
       fits still scrolls, and the sticky headers take a bite out of the first row on the way. -->
  <div class="min-h-dvh bg-mrc-surface text-mrc-ink">
    <AppHeader />
    <!-- pb-16 did not clear the tab bar and buried the end of every page. Both it and the bar
         scale with the root, so no screen size rescues the smaller value. -->
    <main :class="showNav ? 'pb-24 md:pb-0' : ''"><slot /></main>
    <AppTabBar v-if="showNav" />
    <AppToasts />
  </div>
</template>
