import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'

describe('SkeletonTabs', () => {
  it('stands in for a three-label tab bar by default', () => {
    const w = mount(SkeletonTabs)
    expect(w.attributes('data-testid')).toBe('skeleton')
    expect(w.findAll('[data-tab]')).toHaveLength(3)
  })

  // Placeholders at thirds snapping to halves is the jump the skeleton exists to avoid, so
  // a page that knows its tab count says so.
  it('matches the count the page will render', () => {
    expect(mount(SkeletonTabs, { props: { tabs: 2 } }).findAll('[data-tab]')).toHaveLength(2)
  })
})
