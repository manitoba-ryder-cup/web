import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonGrid from '@/components/skeleton/SkeletonGrid.vue'

describe('SkeletonGrid', () => {
  it('renders six cards by default', () => {
    const w = mount(SkeletonGrid)
    expect(w.attributes('data-testid')).toBe('skeleton')
    expect(w.findAll('[data-card]')).toHaveLength(6)
  })

  it('renders the requested number of cards', () => {
    expect(mount(SkeletonGrid, { props: { cards: 2 } }).findAll('[data-card]')).toHaveLength(2)
  })

  it('uses the real CardGrid columns', () => {
    // Composed rather than re-declared, so the skeleton can't drift from the grid it
    // stands in for.
    expect(mount(SkeletonGrid).classes()).toContain('lg:grid-cols-3')
  })
})
