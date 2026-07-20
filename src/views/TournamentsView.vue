<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Tournament } from '@/api/types'
import { formatDateRange } from '@/lib/date'

const tournaments = ref<Tournament[]>([])
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try { tournaments.value = await scorecardApi.listTournaments() }
  catch (e) { error.value = String(e) }
  finally { loading.value = false }
})
</script>
<template>
  <section>
    <h2 class="mb-4 font-display text-xl font-semibold">Tournaments</h2>
    <p v-if="loading" class="text-slate-500">Loading…</p>
    <p v-if="error" class="text-red-600">{{ error }}</p>
    <ul v-if="!loading && tournaments.length" class="divide-y rounded border bg-white">
      <li v-for="t in tournaments" :key="t.id">
        <RouterLink :to="{ name: 'tournament', params: { id: t.id } }" class="block px-4 py-3 hover:bg-slate-50">
          <span class="font-medium">{{ t.name }}</span> — {{ t.location }}
          <div class="text-sm text-slate-500">{{ formatDateRange(t.start_date, t.end_date) }}</div>
        </RouterLink>
      </li>
    </ul>
    <p v-if="!loading && !tournaments.length && !error" class="text-slate-500">No tournaments yet.</p>
  </section>
</template>
