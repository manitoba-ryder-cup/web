import { ref, watchEffect, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface BackLink {
  to: RouteLocationRaw
  label: string
}

// A single shared "where does back go" context. A detail view declares it (below);
// the app header reads it to show a contextual back affordance on mobile.
const back = ref<BackLink | null>(null)

// Read the current back link (the header).
export function useBackLink() {
  return back
}

// Declare the back link for the current page. Tracks its source reactively (so route
// param changes update it) and clears it when the page unmounts.
export function provideBackLink(source: MaybeRefOrGetter<BackLink | null>) {
  watchEffect(() => {
    back.value = toValue(source)
  })
  onUnmounted(() => {
    back.value = null
  })
}
