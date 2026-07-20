import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/base/BaseButton.vue'

describe('BaseButton', () => {
  it('uses the primary variant by default', () => {
    const w = mount(BaseButton, { slots: { default: 'Go' } })
    expect(w.classes()).toContain('bg-mrc-accent')
  })
  it('uses the transparent variant when asked', () => {
    const w = mount(BaseButton, { props: { variant: 'transparent' } })
    expect(w.classes()).toContain('border-white')
  })
  it('disables the button while loading', () => {
    const w = mount(BaseButton, { props: { loading: true } })
    expect(w.attributes('disabled')).toBeDefined()
  })
})
