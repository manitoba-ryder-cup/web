<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ImageHeader from '@/components/typography/ImageHeader.vue'
import ContentContainer from '@/components/layout/ContentContainer.vue'
</script>
<template>
  <ImageHeader image="/img/glen-abbey.webp">News &amp; Media</ImageHeader>
  <ContentContainer>
    <!-- Intentional placeholder: production has published articles, but the news feature
         (backend + article views) isn't built in the rewrite yet. Kept deliberately
         branded rather than an empty/broken-looking page, with a path to real content. -->
    <div class="py-16 text-center">
      <h2 class="font-display text-xl font-bold uppercase tracking-wide text-mrc-ink">Coming soon</h2>
      <p class="mx-auto mt-3 max-w-md text-mrc-muted">
        Tournament recaps, photos, and news will live here. In the meantime, browse the
        <RouterLink to="/tournaments" class="text-mrc-accent underline">tournament history</RouterLink>.
      </p>
    </div>
  </ContentContainer>
</template>
