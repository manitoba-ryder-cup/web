import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonTabs from '@/components/skeleton/SkeletonTabs.vue'

describe('SkeletonTabs', () => {
  it('renders a three-label tab bar', () => {
    const w = mount(SkeletonTabs)
    expect(w.attributes('data-testid')).toBe('skeleton')
    expect(w.findAll('[data-tab]')).toHaveLength(3)
  })
})
