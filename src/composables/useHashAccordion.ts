import { nextTick, ref } from 'vue'
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// One open row at a time, with the open one named in the URL hash so it can be linked to
// and shared. Pairs with BaseAccordion, which builds its anchor from the same id.
//
// `ids` is a getter rather than a plain array so a hash that arrives before the data does
// still opens the right row once it lands — the common case on a deep link.
export function useHashAccordion(ids: () => string[]) {
  const openId = ref('')
  const route = useRoute()
  const router = useRouter()

  watch(
    [ids, () => route.hash],
    async () => {
      const id = route.hash.replace('#', '')
      // The hash says which row is open, in both directions: following a link off this
      // page onto another profile leaves it behind, and the row the last one had open
      // must not still be open under a URL that no longer names it.
      if (!id) {
        openId.value = ''
        return
      }
      if (openId.value === id || !ids().includes(id)) return
      openId.value = id
      // `nearest` rather than `start`: the row is usually the current cup, which sits at
      // the top of the list, and pinning it to the top of the viewport would push the
      // player's avatar and record off screen to reveal something already visible. An old
      // cup reached from a legacy /players/:id/tournaments/:id link is far down and still
      // gets scrolled to — just by the least amount that brings it into view.
      await nextTick()
      document.getElementById(`accordion-${id}`)?.scrollIntoView({ block: 'nearest' })
    },
    { immediate: true },
  )

  function toggle(id: string) {
    const nowOpen = openId.value !== id
    openId.value = nowOpen ? id : ''
    // replace, not push: opening rows shouldn't fill the back button with steps through
    // one page. The query rides along because an omitted one resolves to empty, which
    // would drop the `from` the profile's back link is derived from.
    router.replace({ query: route.query, hash: nowOpen ? `#${id}` : '' })
  }

  return { openId, toggle }
}
