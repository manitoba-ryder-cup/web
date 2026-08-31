import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHashScroll } from '@/composables/useHashScroll'

// `ids` is a getter, not an array, so a hash arriving before the data still opens the right
// row once it lands — the common case on a deep link.
export function useHashAccordion(ids: () => string[]) {
  const openId = ref('')
  const route = useRoute()
  const router = useRouter()

  // Only when the hash opens a row that was shut, so a tap scrolls nothing: an expanded row is
  // taller than a phone, which sends `nearest` to the top edge — what it was chosen to avoid.
  const scrollTo = ref('')

  watch(
    [ids, () => route.hash],
    () => {
      const id = route.hash.replace('#', '')
      // Both directions: following a link off this page must not leave the last row open under a
      // URL that no longer names it.
      if (!id) {
        openId.value = ''
        scrollTo.value = ''
        return
      }
      if (openId.value === id || !ids().includes(id)) return
      openId.value = id
      scrollTo.value = `accordion-${id}`
    },
    { immediate: true },
  )

  // `nearest`, not `start`: the row is usually the current cup at the top of the list, and
  // pinning it to the viewport top pushes the avatar and record off to reveal nothing new.
  useHashScroll(() => scrollTo.value, 'nearest')

  function toggle(id: string) {
    const nowOpen = openId.value !== id
    openId.value = nowOpen ? id : ''
    // replace, not push, or opening rows fills the back button. The query rides along because an
    // omitted one resolves to empty, dropping the `from` the back link is derived from.
    router.replace({ query: route.query, hash: nowOpen ? `#${id}` : '' })
  }

  return { openId, toggle }
}
