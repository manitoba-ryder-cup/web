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
    <!-- The bar is fixed, so the padding is what stops it covering the end of a page. -->
    <main :class="showNav ? 'pb-16 md:pb-0' : ''"><slot /></main>
    <AppTabBar v-if="showNav" />
    <AppToasts />
  </div>
</template>
