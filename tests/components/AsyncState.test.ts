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
  it('prefers a given loading slot over the default text', () => {
    const w = mount(AsyncState, {
      props: { loading: true, error: '' },
      slots: { ...slots, loading: '<div class="skeleton" />' },
    })

    expect(w.find('.skeleton').exists()).toBe(true)
    expect(w.find('p.text-mrc-muted').exists()).toBe(false)
    expect(w.find('.loaded').exists()).toBe(false)
  })

  it('announces the load even when a silent skeleton replaces the text', () => {
    // A skeleton is a pile of aria-hidden divs. Without this, a screen reader is told
    // nothing at all while the page loads — the visible "Loading…" was the announcement.
    const w = mount(AsyncState, {
      props: { loading: true, error: '' },
      slots: { ...slots, loading: '<div class="skeleton" />' },
    })

    expect(w.get('.sr-only').text()).toBe('Loading…')
    expect(w.get('.sr-only').attributes('role')).toBe('status')
  })

  it('does not announce twice when using the default text', () => {
    const w = mount(AsyncState, { props: { loading: true, error: '' }, slots })

    expect(w.get('.sr-only').text()).toBe('Loading…')
    expect(w.get('p.text-mrc-muted').attributes('aria-hidden')).toBe('true')
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
