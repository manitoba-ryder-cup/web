import { describe, it, expect } from 'vitest'
import { splitPoints } from '@/lib/points'

describe('splitPoints', () => {
  it('splits a half off the whole', () => {
    expect(splitPoints(3.5)).toEqual({ whole: 3, half: true })
  })

  it('carries no half for a whole total', () => {
    expect(splitPoints(4)).toEqual({ whole: 4, half: false })
  })

  // Half a point on its own still leads with the 0 it is a fraction of, rather than reading as
  // a bare fraction that could be mistaken for a match score.
  it('keeps the leading whole for half a point', () => {
    expect(splitPoints(0.5)).toEqual({ whole: 0, half: true })
  })

  it('reads a side with no points yet as none', () => {
    expect(splitPoints(undefined)).toEqual({ whole: 0, half: false })
  })
})
