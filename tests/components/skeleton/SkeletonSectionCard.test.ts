import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonSectionCard from '@/components/skeleton/SkeletonSectionCard.vue'

describe('SkeletonSectionCard', () => {
  it('renders four rows by default', () => {
    const w = mount(SkeletonSectionCard)
    expect(w.attributes('data-testid')).toBe('skeleton')
    expect(w.findAll('[data-row]')).toHaveLength(4)
  })

  it('renders the requested number of rows', () => {
    expect(mount(SkeletonSectionCard, { props: { rows: 2 } }).findAll('[data-row]')).toHaveLength(2)
  })

  it("uses SectionCard's real dark header band", () => {
    // The band is certain to be there and certain to be dark. A pale stand-in only buys a
    // lurch to dark when the real card lands.
    expect(mount(SkeletonSectionCard).find('[data-band]').classes()).toContain('bg-mrc-muted')
  })
})
