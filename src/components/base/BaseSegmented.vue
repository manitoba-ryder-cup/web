<script setup lang="ts">
import { useHashSelection } from '@/composables/useHashSelection'

// A filter that narrows one list, where BaseTabs is a set of peer destinations. It stays
// inside the page's padding as a pill so the content beneath it — which may have headings
// of its own — can't read it as a second navigation bar.
const props = withDefaults(defineProps<{ options: string[]; label: string; syncHash?: boolean }>(), { syncHash: true })

const { active } = useHashSelection(() => props.options, props.syncHash)
</script>
<template>
  <div>
    <div class="flex justify-center">
      <!-- Toggle buttons rather than a tablist: the panel below is one list under two
           scopes, and a group of pressed/unpressed buttons says that without the arrow-key
           contract a tablist owes its user.
           The focus ring is offset onto the track because it is the accent, and so is the
           active fill — drawn on the edge it would vanish on the option you are focusing. -->
      <div role="group" :aria-label="label" class="inline-grid auto-cols-fr grid-flow-col rounded-full bg-mrc-panel-alt p-1">
        <button
          v-for="(o, i) in options"
          :key="o"
          type="button"
          :aria-pressed="i === active"
          class="flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-5 font-display text-sm font-bold uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mrc-accent"
          :class="i === active ? 'bg-mrc-accent text-white shadow' : 'text-mrc-charcoal'"
          @click="active = i"
        >
          {{ o }}
        </button>
      </div>
    </div>
    <div class="pt-6">
      <slot :option="options[active]" :index="active" />
    </div>
  </div>
</template>
