import { describe, it, expect } from 'vitest'
import { centreOffset, nudgeOffset } from '@/lib/strokeStrip'

describe('centreOffset', () => {
  it('puts the tile in the middle of the strip', () => {
    // A 90px tile starting at 400, in a 390 viewport: its centre lands at 195.
    expect(centreOffset(400, 90, 390)).toBe(250)
  })

  it('never asks for a negative offset', () => {
    expect(centreOffset(0, 90, 390)).toBe(0)
  })
})

describe('nudgeOffset', () => {
  // The property the whole design rests on: choosing a stroke you can already see must
  // leave the strip exactly where it is, or the fills stop lining up across players.
  it('does not move for a tile already in view', () => {
    expect(nudgeOffset(250, 390, 400, 90)).toBe(250)
  })

  it('leaves a tile flush against either edge alone', () => {
    expect(nudgeOffset(400, 390, 400, 90)).toBe(400)
    expect(nudgeOffset(100, 390, 400, 90)).toBe(100)
  })

  it('brings a tile off the left edge just into view', () => {
    expect(nudgeOffset(500, 390, 400, 90)).toBe(400)
  })

  it('brings a tile off the right edge just into view', () => {
    // 400 + 90 = 490 must be the right edge, so the strip sits at 490 - 390.
    expect(nudgeOffset(0, 390, 400, 90)).toBe(100)
  })

  it('never asks for a negative offset', () => {
    expect(nudgeOffset(50, 390, -20, 90)).toBe(0)
  })
})
