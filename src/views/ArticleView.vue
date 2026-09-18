<script setup lang="ts">
import { computed } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { allArticles } from '@/content'
import { findBySlug } from '@/lib/news'
import { formatDate } from '@/lib/date'

const props = defineProps<{ slug: string }>()
const article = computed(() => findBySlug(allArticles, props.slug))
</script>
<template>
  <PageLayout v-if="article" :title="article.title" image="/img/crowd.webp">
    <p class="text-sm text-mrc-faint">{{ formatDate(article.published_at) }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -- built from a repo file, the same trust as any source in it -->
    <div class="article mt-4" v-html="article.html" />
  </PageLayout>
  <PageLayout v-else title="Article not found" image="/img/crowd.webp">
    <p class="py-6 text-center text-mrc-muted">That article does not exist.</p>
  </PageLayout>
</template>
