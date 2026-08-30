import { nextTick, watch } from 'vue'

// Brings into view whatever `targetId` names, each time it names something new — only on a
// change, so a page re-rendering under a reader who has scrolled away does not drag them back.
export function useHashScroll(targetId: () => string, block: ScrollLogicalPosition) {
  watch(
    targetId,
    async (id) => {
      if (!id) return
      await nextTick()
      document.getElementById(id)?.scrollIntoView({ block })
    },
    { immediate: true },
  )
}
