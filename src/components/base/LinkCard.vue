<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import BaseCard from '@/components/base/BaseCard.vue'
defineProps<{ to: RouteLocationRaw }>()
</script>
<template>
  <RouterLink :to="to" class="block transition hover:shadow-lg">
    <BaseCard><slot /></BaseCard>
  </RouterLink>
</template>
