import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonBlock from '@/components/skeleton/SkeletonBlock.vue'

describe('SkeletonBlock', () => {
  it('pulses, and stops pulsing under reduced motion', () => {
    const w = mount(SkeletonBlock)
    expect(w.classes()).toContain('animate-pulse')
    // Without this a skeleton is a full-page strobe for anyone who asked the OS to stop
    // animations. The block stays visible; only the animation goes.
    expect(w.classes()).toContain('motion-reduce:animate-none')
  })

  it('is hidden from screen readers', () => {
    // The blocks carry no information. AsyncState announces the load instead.
    expect(mount(SkeletonBlock).attributes('aria-hidden')).toBe('true')
  })

  it('defaults to a small radius on a light surface', () => {
    const w = mount(SkeletonBlock)
    expect(w.classes()).toContain('rounded')
    expect(w.classes()).toContain('bg-mrc-line')
  })

  it.each([
    ['none', undefined],
    ['sm', 'rounded'],
    ['md', 'rounded-md'],
    ['full', 'rounded-full'],
  ])('maps radius %s', (radius, expected) => {
    const w = mount(SkeletonBlock, { props: { radius: radius as 'none' | 'sm' | 'md' | 'full' } })
    if (expected) expect(w.classes()).toContain(expected)
    else expect(w.classes().some((c) => c.startsWith('rounded'))).toBe(false)
  })

  it('uses a blurred translucent fill on the inverse tone', () => {
    // Over the dashboard's crowd photo a flat alpha has no stable contrast; the blur
    // flattens the backdrop so the block reads as a panel rather than haze.
    const w = mount(SkeletonBlock, { props: { tone: 'inverse' } })
    expect(w.classes()).toContain('bg-white/30')
    expect(w.classes()).toContain('backdrop-blur-md')
  })

  it('keeps caller-supplied dimension classes', () => {
    const w = mount(SkeletonBlock, { attrs: { class: 'h-4 w-32' } })
    expect(w.classes()).toContain('h-4')
    expect(w.classes()).toContain('w-32')
  })
})
