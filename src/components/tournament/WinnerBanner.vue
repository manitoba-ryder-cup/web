<script setup lang="ts">
import { computed } from 'vue'
import TrophyIcon from '@/components/icons/TrophyIcon.vue'
const props = defineProps<{ winnerColor: 'Red' | 'Blue' | 'Tied' | null }>()
const colorClass = computed(() => (props.winnerColor === 'Red' ? 'text-mrc-red-team' : 'text-mrc-blue-team'))
</script>
<template>
  <div class="flex items-center gap-2 font-semibold">
    <template v-if="winnerColor === 'Tied'">Tied</template>
    <template v-else-if="winnerColor === 'Red' || winnerColor === 'Blue'">
      <TrophyIcon class="text-mrc-gold" />
      <span :class="colorClass">{{ winnerColor }}</span>
      <span>wins</span>
    </template>
    <span v-else class="text-mrc-muted">In progress</span>
  </div>
</template>
