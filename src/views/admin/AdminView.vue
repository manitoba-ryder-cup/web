<script setup lang="ts">
import { computed } from 'vue'
import { q } from '@/api/queries'
import { formatDateRange } from '@/lib/date'
import { useResource } from '@/composables/useAsync'
import PageLayout from '@/components/layout/PageLayout.vue'
import AsyncState from '@/components/base/AsyncState.vue'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'
import LinkCard from '@/components/base/LinkCard.vue'

// Admin home: pick a tournament to set up. Most recent first — that's almost always the
// one being worked on.
const { data, error, loading, retry } = useResource(() => q.tournaments())
const tournaments = computed(() => [...(data.value ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date)))
</script>
<template>
  <PageLayout title="Admin" image="/img/oceanside.webp">
    <AsyncState :loading="loading" :error="error" :retry="retry">
      <!-- `card`: this page stacks LinkCards with gaps rather than dividing one container. -->
      <template #loading><SkeletonList card :rows="6" /></template>
      <p class="mb-4 text-mrc-muted">Choose a tournament to assign teams and match lineups.</p>
      <div class="space-y-3">
        <LinkCard v-for="t in tournaments" :key="t.id" :to="{ name: 'admin-tournament', params: { id: t.id } }">
          <div class="flex items-center justify-between">
            <div class="min-w-0">
              <h4 class="truncate">{{ t.location }}</h4>
              <p class="truncate text-sm text-mrc-muted">{{ formatDateRange(t.start_date, t.end_date) }}</p>
            </div>
            <span class="shrink-0 pl-3 text-mrc-faint" aria-hidden="true">›</span>
          </div>
        </LinkCard>
        <p v-if="!tournaments.length" class="text-center text-mrc-muted">No tournaments yet.</p>
      </div>
    </AsyncState>
  </PageLayout>
</template>
