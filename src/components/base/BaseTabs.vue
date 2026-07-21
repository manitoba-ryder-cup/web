<script setup lang="ts">
import { ref, watch } from 'vue'

// Generic tab bar: labels across the top, the active one underlined in the accent
// color (like the old app's Tabs). The default slot receives the active tab label so
// the caller renders only the active panel.
const props = defineProps<{ tabs: string[] }>()
const active = ref(0)

// Keep the active index valid if the tab list shrinks/changes.
watch(() => props.tabs.length, (len) => {
  if (active.value >= len) active.value = 0
})
</script>
<template>
  <div>
    <div class="flex shadow-md">
      <button v-for="(t, i) in tabs" :key="t" type="button"
              class="flex-grow border-b-4 pb-3 pt-5 text-center font-display font-bold uppercase tracking-wide"
              :class="i === active ? 'border-mrc-accent text-mrc-accent' : 'border-transparent text-mrc-muted'"
              @click="active = i">
        {{ t }}
      </button>
    </div>
    <div class="pt-6">
      <slot :tab="tabs[active]" :index="active" />
    </div>
  </div>
</template>
