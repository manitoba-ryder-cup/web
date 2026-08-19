import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordInput from '@/components/base/PasswordInput.vue'

const toggle = 'button[aria-label$="password"]'

describe('PasswordInput', () => {
  it('masks the value until asked to show it, and masks it again', async () => {
    const w = mount(PasswordInput)

    expect(w.find('input').attributes('type')).toBe('password')
    expect(w.find(toggle).attributes('aria-label')).toBe('Show password')

    await w.find(toggle).trigger('click')

    expect(w.find('input').attributes('type')).toBe('text')
    expect(w.find(toggle).attributes('aria-label')).toBe('Hide password')

    await w.find(toggle).trigger('click')

    expect(w.find('input').attributes('type')).toBe('password')
  })

  it('keeps what was typed when the value is revealed', async () => {
    const w = mount(PasswordInput, { props: { modelValue: 'correct-horse-battery' } })

    await w.find(toggle).trigger('click')

    expect(w.find('input').attributes('type')).toBe('text')
    expect((w.find('input').element as HTMLInputElement).value).toBe('correct-horse-battery')
  })

  it('reports what was typed to its parent', async () => {
    const w = mount(PasswordInput)
    await w.find('input').setValue('hunter2')
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['hunter2'])
  })

  // Not type="submit": the control sits beside the password field, and a stray submit would
  // send a half-filled form instead of revealing anything.
  it('does not submit the form', () => {
    expect(mount(PasswordInput).find(toggle).attributes('type')).toBe('button')
  })
})
