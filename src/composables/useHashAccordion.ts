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
      if (!id || openId.value === id || !ids().includes(id)) return
      openId.value = id
      // On a deep link the row can be far down a long list.
      await nextTick()
      document.getElementById(`accordion-${id}`)?.scrollIntoView({ block: 'start' })
    },
    { immediate: true },
  )

  function toggle(id: string) {
    const nowOpen = openId.value !== id
    openId.value = nowOpen ? id : ''
    // replace, not push: opening rows shouldn't fill the back button with steps through
    // one page.
    router.replace({ hash: nowOpen ? `#${id}` : '' })
  }

  return { openId, toggle }
}
