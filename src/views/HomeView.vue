<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { scorecardApi } from '@/api/scorecard'
import type { MatchFormat } from '@/api/types'
const formats = ref<MatchFormat[]>([])
const error = ref('')
onMounted(async () => {
  try { formats.value = await scorecardApi.listMatchFormats() }
  catch (e) { error.value = String(e) }
})
</script>
<template>
  <section>
    <h2 class="mb-4 text-xl font-semibold">Match formats (public)</h2>
    <p v-if="error" class="text-red-600">{{ error }}</p>
    <ul class="list-disc pl-6">
      <li v-for="f in formats" :key="f.id">{{ f.name }}</li>
    </ul>
  </section>
</template>
