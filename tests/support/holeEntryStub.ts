import { defineComponent, h } from 'vue'
import { useMatchContext } from '@/composables/useMatchContext'

// The mirror of CardStub, and reading the same entry it does — which is what a test asserting
// one write reaches both is for. Stands in for the hole a reader taps next.
export const HoleEntryStub = defineComponent({
  setup() {
    const { holeStates } = useMatchContext(
      () => 't1',
      () => 'm1',
    )
    return () => h('div', { 'data-testid': 'hole' }, String(holeStates.value.length))
  },
})
