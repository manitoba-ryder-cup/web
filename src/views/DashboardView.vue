<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { Tournament } from '@/api/types'
const tournaments = ref<Tournament[]>([])
const error = ref('')
onMounted(async () => {
  try { tournaments.value = await scorecardApi.listTournaments() }
  catch (e) { error.value = String(e) }
})
</script>
<template>
  <section>
    <h2 class="mb-4 text-xl font-semibold">Tournaments (requires login)</h2>
    <p v-if="error" class="text-red-600">{{ error }}</p>
    <ul class="divide-y rounded border bg-white">
      <li v-for="t in tournaments" :key="t.id" class="px-4 py-2">
        <span class="font-medium">{{ t.name }}</span> — {{ t.location }}
      </li>
    </ul>
    <p v-if="!tournaments.length && !error" class="text-slate-500">No tournaments yet.</p>
  </section>
</template>
