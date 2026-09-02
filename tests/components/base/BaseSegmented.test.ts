import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseSegmented from '@/components/base/BaseSegmented.vue'

const base = { options: ['One', 'Two', 'Three'], modelValue: 1, label: 'Which one' }
const buttons = (w: ReturnType<typeof mount>) => w.findAll('button')

describe('BaseSegmented', () => {
  it('marks the chosen option and announces the group', () => {
    const w = mount(BaseSegmented, { props: base })

    expect(w.get('[role="radiogroup"]').attributes('aria-label')).toBe('Which one')
    expect(buttons(w).map((b) => b.attributes('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(buttons(w)[1].classes()).toContain('bg-mrc-accent')
  })

  it('emits the index it was asked for rather than holding the value itself', async () => {
    const w = mount(BaseSegmented, { props: base })

    await buttons(w)[2].trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([[2]])
    // Still showing the caller's value: the caller owns it.
    expect(buttons(w)[1].attributes('aria-checked')).toBe('true')
  })

  // One control, not three buttons: Tab reaches it once and the arrows move within it.
  it('is a single tab stop on the chosen option', () => {
    const w = mount(BaseSegmented, { props: base })

    expect(buttons(w).map((b) => b.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
  })

  it('moves with the arrow keys and stops at the ends', async () => {
    const w = mount(BaseSegmented, { props: { ...base, modelValue: 0 } })
    const group = w.get('[role="radiogroup"]')

    await group.trigger('keydown', { key: 'ArrowLeft' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([0])

    await group.trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([1])

    await group.trigger('keydown', { key: 'End' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([2])
  })

  it('gives every option a 44px tap target', () => {
    // In px, not rems: the root is under 16px on a phone, where min-h-11 renders short of 44.
    expect(buttons(mount(BaseSegmented, { props: base })).every((b) => b.classes('min-h-[44px]'))).toBe(true)
  })
})
