import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonList from '@/components/skeleton/SkeletonList.vue'

describe('SkeletonList', () => {
  it('renders five rows by default in one bordered container', () => {
    const w = mount(SkeletonList)
    expect(w.attributes('data-testid')).toBe('skeleton')
    expect(w.classes()).toContain('divide-y')
    expect(w.findAll('[data-row]')).toHaveLength(5)
  })

  it('renders the requested number of rows', () => {
    expect(mount(SkeletonList, { props: { rows: 3 } }).findAll('[data-row]')).toHaveLength(3)
  })

  it('renders separate cards in card mode', () => {
    // AdminView stacks LinkCards with gaps; the divided container would misrepresent it.
    const w = mount(SkeletonList, { props: { rows: 2, card: true } })
    expect(w.classes()).toContain('space-y-3')
    expect(w.classes()).not.toContain('divide-y')
    expect(w.findAll('[data-row]')).toHaveLength(2)
  })
})
