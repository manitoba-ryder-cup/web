import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseInput from '@/components/base/BaseInput.vue'

describe('BaseInput', () => {
  it('emits update:modelValue on input', async () => {
    const w = mount(BaseInput, { props: { modelValue: '' } })
    await w.get('input').setValue('hello')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })
  it('shows the invalid border when invalid', () => {
    const w = mount(BaseInput, { props: { modelValue: '', invalid: true } })
    expect(w.get('input').classes()).toContain('border-mrc-red-team')
  })
})
