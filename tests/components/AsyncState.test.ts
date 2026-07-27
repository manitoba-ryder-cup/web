import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AsyncState from '@/components/base/AsyncState.vue'

const slots = { default: '<div class="loaded">yes</div>' }
describe('AsyncState', () => {
  it('shows loading and hides the slot', () => {
    const w = mount(AsyncState, { props: { loading: true, error: '' }, slots })
    expect(w.text()).toContain('Loading')
    expect(w.find('.loaded').exists()).toBe(false)
  })
  it('shows the error over the slot', () => {
    const w = mount(AsyncState, { props: { loading: false, error: 'nope' }, slots })
    expect(w.text()).toContain('nope')
    expect(w.find('.loaded').exists()).toBe(false)
  })
  it('offers a retry when one is given', async () => {
    const retry = vi.fn()
    const w = mount(AsyncState, { props: { loading: false, error: 'nope', retry }, slots })

    await w.get('button').trigger('click')

    expect(retry).toHaveBeenCalledOnce()
  })

  it('has no retry button when no retry is given', () => {
    // Most views load once and have nothing to re-run; a dead button would be worse.
    const w = mount(AsyncState, { props: { loading: false, error: 'nope' }, slots })

    expect(w.find('button').exists()).toBe(false)
  })

  it('shows empty text when empty', () => {
    const w = mount(AsyncState, { props: { loading: false, error: '', empty: true, emptyText: 'None' }, slots })
    expect(w.text()).toContain('None')
  })
  it('renders the slot when loaded', () => {
    const w = mount(AsyncState, { props: { loading: false, error: '' }, slots })
    expect(w.find('.loaded').exists()).toBe(true)
  })
})
