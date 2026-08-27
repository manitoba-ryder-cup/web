import { defineComponent, h } from 'vue'
import { useMatchContext } from '@/composables/useMatchContext'

// The mirror of CardStub: the entry page keys the match on parOptional: false, so a write made
// from the card has to reach this copy too. Stands in for the hole a reader taps next.
export const HoleEntryStub = defineComponent({
  setup() {
    const { holeStates } = useMatchContext(
      () => 't1',
      () => 'm1',
    )
    return () => h('div', { 'data-testid': 'hole' }, String(holeStates.value.length))
  },
})
