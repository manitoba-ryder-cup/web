<script setup lang="ts">
import { nextTick, ref } from 'vue'

// A control that swaps what a view shows, where BaseTabs is a set of peer destinations.
// Unlike the tabs it owns nothing: the caller holds the value and decides what it means.
//
// Radios rather than buttons, with one tab stop and the arrows moving between them, since
// this is one choice out of a few rather than several independent toggles.
const props = defineProps<{ options: string[]; modelValue: number; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [index: number] }>()

const group = ref<HTMLElement | null>(null)

function select(i: number) {
  emit('update:modelValue', i)
}
function onKeydown(e: KeyboardEvent) {
  const last = props.options.length - 1
  const to =
    e.key === 'ArrowRight' || e.key === 'ArrowDown'
      ? Math.min(last, props.modelValue + 1)
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        ? Math.max(0, props.modelValue - 1)
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? last
            : -1
  if (to < 0) return
  e.preventDefault()
  select(to)
  nextTick(() => group.value?.querySelectorAll<HTMLElement>('button')[to]?.focus())
}
</script>
<template>
  <div ref="group" role="radiogroup" :aria-label="label" class="flex rounded-full bg-mrc-panel-alt p-1" @keydown="onKeydown">
    <button
      v-for="(o, i) in options"
      :key="o"
      type="button"
      role="radio"
      :aria-checked="i === modelValue"
      :tabindex="i === modelValue ? 0 : -1"
      class="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 font-display text-sm font-bold uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mrc-accent"
      :class="i === modelValue ? 'bg-mrc-accent text-white shadow' : 'text-mrc-charcoal'"
      @click="select(i)"
    >
      <slot name="option" :option="o" :index="i" :selected="i === modelValue">{{ o }}</slot>
    </button>
  </div>
</template>
