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
  <div class="min-h-screen bg-mrc-surface text-mrc-ink">
    <AppHeader />
    <!-- The bar is fixed, so this padding is what stops it covering the end of a page. It
         has to exceed the bar's height, which is ~71px on a phone — `pb-16` is 4rem, and
         this app puts 14px on `html` below md, so that came out at 56px and buried the
         last 15px of every page. The inset is the bar's too: it grows by exactly that. -->
    <main :class="showNav ? 'pb-[calc(6rem_+_env(safe-area-inset-bottom))] md:pb-0' : ''"><slot /></main>
    <AppTabBar v-if="showNav" />
    <AppToasts />
  </div>
</template>
