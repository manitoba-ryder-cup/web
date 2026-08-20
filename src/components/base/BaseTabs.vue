<script setup lang="ts">
import { useHashSelection } from '@/composables/useHashSelection'

// Generic tab bar: labels across the top, the active one underlined in the accent
// color (like the old app's Tabs). The default slot receives the active tab label so
// the caller renders only the active panel.
//
// Tabs are peer destinations. A choice that narrows one list is a filter, and reads as a
// second navigation bar in this shape — BaseSegmented is that.
const props = withDefaults(defineProps<{ tabs: string[]; syncHash?: boolean }>(), { syncHash: true })

const { active } = useHashSelection(() => props.tabs, props.syncHash)
</script>
<template>
  <div>
    <div class="flex shadow-md">
      <button
        v-for="(t, i) in tabs"
        :key="t"
        type="button"
        class="flex-grow border-b-4 pb-3 pt-5 text-center font-display font-bold uppercase tracking-wide"
        :class="i === active ? 'border-mrc-accent text-mrc-accent' : 'border-transparent text-mrc-muted'"
        @click="active = i"
      >
        {{ t }}
      </button>
    </div>
    <div class="pt-6">
      <slot :tab="tabs[active]" :index="active" />
    </div>
  </div>
</template>
