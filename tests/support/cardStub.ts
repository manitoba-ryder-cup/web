import { defineComponent, h } from 'vue'
import { useMatchContext } from '@/composables/useMatchContext'

// The card keys the match on parOptional: true and the entry page on false, so they are two
// cache entries. This stands in for the card, holding the key a save has to reach.
export const CardStub = defineComponent({
  setup() {
    const { holeStates } = useMatchContext(
      () => 't1',
      () => 'm1',
      { parOptional: true },
    )
    return () => h('div', { 'data-testid': 'card' }, String(holeStates.value.length))
  },
})
