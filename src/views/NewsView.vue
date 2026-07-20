<script setup lang="ts">
import { RouterLink } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
</script>
<template>
  <PageLayout title="News &amp; Media" image="/img/glen-abbey.webp">
    <div class="text-center">
      <h2 class="font-display text-xl font-bold uppercase tracking-wide text-mrc-ink">Coming soon</h2>
      <p class="mx-auto mt-3 max-w-md text-mrc-muted">
        Tournament recaps, photos, and news will live here. In the meantime, browse the
        <RouterLink to="/tournaments" class="text-mrc-accent underline">tournament history</RouterLink>.
      </p>
    </div>
  </PageLayout>
</template>
