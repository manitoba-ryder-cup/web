import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useHashScroll } from '@/composables/useHashScroll'

// jsdom has no layout and no scrollIntoView, so the assertion is on how it was asked to
// scroll rather than on where the page ended up.
const scrollIntoView = vi.fn()

const Host = defineComponent({
  props: {
    target: { type: String, required: true },
    rows: { type: Array as () => string[], default: () => [] },
  },
  setup(props) {
    useHashScroll(() => props.target, 'center')
  },
  template: `<div><div v-for="i in rows" :key="i" :id="i">{{ i }}</div></div>`,
})

describe('useHashScroll', () => {
  // Unmounted between cases: these attach to the document, so rows left behind would be
  // found by the next case's getElementById and it would pass on the wrong element.
  const mounted: { unmount: () => void }[] = []
  afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  // Attached, because the element is found with document.getElementById and a detached
  // mount is not in the document.
  const host = async (target: string, rows: string[] = []) => {
    const w = mount(Host, { props: { target, rows }, attachTo: document.body })
    mounted.push(w)
    await flushPromises()
    return w
  }

  it('brings the named element into view', async () => {
    await host('hole-7', ['hole-7'])

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })

  it('scrolls again once a different target is named', async () => {
    const w = await host('hole-7', ['hole-7', 'hole-8'])
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await w.setProps({ target: 'hole-8' })
    await flushPromises()

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  // The card re-renders on every poll while a cup is being played, and a reader who has
  // scrolled away must not be dragged back to the same row each time.
  it('answers one target once', async () => {
    const w = await host('hole-7', ['hole-7'])
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await w.setProps({ rows: ['hole-7', 'hole-8'] })
    await flushPromises()

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
})
