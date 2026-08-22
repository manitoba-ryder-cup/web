<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// The active tab lives in the URL hash so a refresh or a shared link reopens it. One page
// can own the hash, so syncHash: false is for a page already spending it elsewhere.
const props = withDefaults(defineProps<{ tabs: string[]; syncHash?: boolean }>(), { syncHash: true })

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

const active = ref(props.syncHash ? indexFromHash() : 0)

if (props.syncHash) {
  // replace, not push: a refresh restores the tab without piling up history entries.
  watch(active, (i) => {
    const target = `#${slugs.value[i]}`
    if (route.hash !== target) router.replace({ path: route.path, query: route.query, hash: target })
  })

  // Follow the hash the other way too (back/forward, or a pasted link once tabs are known).
  watch([() => route.hash, slugs], () => {
    const i = indexFromHash()
    if (i !== active.value) active.value = i
  })
}

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
