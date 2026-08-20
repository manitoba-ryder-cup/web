import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// One choice out of a labelled set, mirrored in the URL hash (e.g. #all-time) so a refresh
// or a shared link reopens the same one. The hash is a single slot, so a page can have one
// owner of it: syncHash false leaves the choice in local state, for a page that already
// spends its hash on something else (the player profile keeps the open cup there, which is
// what the roster links to).
export function useHashSelection(labels: () => string[], syncHash = true) {
  const route = useRoute()
  const router = useRouter()

  const slugify = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  const slugs = computed(() => labels().map(slugify))

  // The entry the current hash points at, or the first when the hash is absent/unknown.
  function indexFromHash(): number {
    const i = slugs.value.indexOf(route.hash.replace(/^#/, ''))
    return i >= 0 ? i : 0
  }

  const active = ref(syncHash ? indexFromHash() : 0)

  if (syncHash) {
    // Replace, not push — a refresh restores the choice without piling up history entries.
    // No scrollBehavior is configured, so this won't jump the page.
    watch(active, (i) => {
      const target = `#${slugs.value[i]}`
      if (route.hash !== target) router.replace({ path: route.path, query: route.query, hash: target })
    })

    // Follow the hash the other way too (back/forward, or a pasted link once the labels
    // are known).
    watch([() => route.hash, slugs], () => {
      const i = indexFromHash()
      if (i !== active.value) active.value = i
    })
  }

  // Keep the active index valid if the set shrinks/changes.
  watch(
    () => slugs.value.length,
    (len) => {
      if (active.value >= len) active.value = 0
    },
  )

  return { active, slugs }
}
