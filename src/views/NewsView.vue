<script setup lang="ts">
import { RouterLink } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import { allArticles } from '@/content'
import { groupByCup } from '@/lib/news'
import { formatDate } from '@/lib/date'

// Bundled rather than fetched, so there is no loading or error state to render — and the page
// still reads when the API is down.
const cups = groupByCup(allArticles)
</script>
<template>
  <PageLayout title="News" image="/img/crowd.webp">
    <p v-if="!cups.length" class="py-6 text-center text-mrc-muted">Nothing written yet.</p>
    <div v-else class="space-y-10">
      <section v-for="group in cups" :key="group.cup">
        <h2 class="font-body tabular-nums text-mrc-muted">{{ group.cup }}</h2>
        <ul class="mt-4 space-y-3">
          <li v-for="article in group.articles" :key="article.slug">
            <RouterLink
              :to="`/news/${article.slug}`"
              class="block rounded-md border border-mrc-line bg-white p-4 hover:border-mrc-line-strong"
            >
              <h4>{{ article.title }}</h4>
              <p class="mt-1 text-mrc-muted">{{ article.summary }}</p>
              <p class="mt-2 text-sm text-mrc-faint">{{ formatDate(article.published_at) }}</p>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </PageLayout>
</template>
