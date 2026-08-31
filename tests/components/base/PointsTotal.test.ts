import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PointsTotal from '@/components/base/PointsTotal.vue'

describe('PointsTotal', () => {
  const mountIt = (points: number | undefined, size?: 'md' | 'lg') => mount(PointsTotal, { props: { points, size } })

  // Assertions elsewhere read a standing straight out of the rendered text, and a gap between
  // the whole and its half would break every one of them.
  it('reads as one string', () => {
    expect(mountIt(3.5).text()).toBe('3½')
  })

  it('leaves the half off a whole total', () => {
    const w = mountIt(4)

    expect(w.text()).toBe('4')
    expect(w.findAll('span')).toHaveLength(2) // the wrapper and the whole, no third
  })

  it('is 0 for a side with no points yet', () => {
    expect(mountIt(undefined).text()).toBe('0')
  })

  // Half a point is a fraction of a point rather than the digit after it, so it is drawn as its
  // own smaller mark rather than inheriting the numeral's size.
  it('draws the half smaller than the whole', () => {
    const [, whole, half] = mountIt(3.5).findAll('span')

    expect(whole.classes()).toContain('text-6xl')
    expect(half.classes()).not.toContain('text-6xl')
    expect(half.classes()).toContain('text-3xl')
  })

  it('draws the larger size the same way', () => {
    const [, whole, half] = mountIt(3.5, 'lg').findAll('span')

    expect(whole.classes()).toContain('text-7xl')
    expect(half.classes()).not.toContain('text-7xl')
    expect(half.classes()).toContain('text-4xl')
  })

  // Numerals are data and take the body face; the display face is for names and labels.
  it('keeps numerals out of the display face', () => {
    const w = mountIt(3.5)

    expect(w.classes()).toContain('font-body')
    expect(w.html()).not.toContain('font-display')
  })
})
