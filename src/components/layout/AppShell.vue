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
    <!-- Has to exceed the bar's height: pb-16 is 4rem, and this app puts 14px on html below md,
         so it came out at 56px against a 71px bar and buried the last 15px of every page. -->
    <main :class="showNav ? 'pb-24 md:pb-0' : ''"><slot /></main>
    <AppTabBar v-if="showNav" />
    <AppToasts />
  </div>
</template>
