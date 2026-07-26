<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Generic tab bar: labels across the top, the active one underlined in the accent
// color (like the old app's Tabs). The default slot receives the active tab label so
// the caller renders only the active panel.
//
// The active tab is mirrored in the URL hash (e.g. #alt-shot) so a refresh or a shared
// link reopens the same tab. The hash is a single slot, so a page should render at most
// one tab bar; two would fight over it (add a namespaced key here if that ever comes up).
const props = defineProps<{ tabs: string[] }>()

const route = useRoute()
const router = useRouter()

const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const slugs = computed(() => props.tabs.map(slugify))

// The tab the current hash points at, or the first tab when the hash is absent/unknown.
function indexFromHash(): number {
  const i = slugs.value.indexOf(route.hash.replace(/^#/, ''))
  return i >= 0 ? i : 0
}

const active = ref(indexFromHash())

// Reflect the active tab in the hash (replace, not push — refresh restores the tab without
// piling up history entries). No scrollBehavior is configured, so this won't jump the page.
watch(active, (i) => {
  const target = `#${slugs.value[i]}`
  if (route.hash !== target) router.replace({ path: route.path, query: route.query, hash: target })
})

// Follow the hash the other way too (back/forward, or a pasted link once tabs are known).
watch([() => route.hash, slugs], () => {
  const i = indexFromHash()
  if (i !== active.value) active.value = i
})

// Keep the active index valid if the tab list shrinks/changes.
watch(
  () => props.tabs.length,
  (len) => {
    if (active.value >= len) active.value = 0
  },
)
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
