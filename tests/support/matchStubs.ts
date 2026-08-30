import { defineComponent, h } from 'vue'
import { useMatchContext } from '@/composables/useMatchContext'

// The card and the hole page read one cache entry between them — `parOptional` decides only
// whether a missing tee set is fatal, not what the match is keyed on.
const matchStub = (testId: string, parOptional: boolean) =>
  defineComponent({
    setup() {
      const { holeStates } = useMatchContext(
        () => 't1',
        () => 'm1',
        { parOptional },
      )
      return () => h('div', { 'data-testid': testId }, String(holeStates.value.length))
    },
  })

export const CardStub = matchStub('card', true)
export const HoleEntryStub = matchStub('hole', false)
