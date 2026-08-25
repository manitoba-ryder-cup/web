import { describe, it, expect } from 'vitest'
import { centreOffset, revealOffset } from '@/lib/strokeStrip'

describe('centreOffset', () => {
  it('puts the tile in the middle of the strip', () => {
    // A 90px tile starting at 400, in a 390 viewport: its centre lands at 195.
    expect(centreOffset(400, 90, 390)).toBe(250)
  })

  it('never asks for a negative offset', () => {
    expect(centreOffset(0, 90, 390)).toBe(0)
  })
})

describe('revealOffset', () => {
  // The property the whole design rests on: choosing a stroke you can already see must
  // leave the strip exactly where it is, or the fills stop lining up across players.
  it('does not move for a tile already in view', () => {
    expect(revealOffset(250, 390, 400, 90)).toBe(250)
  })

  it('leaves a tile flush against either edge alone', () => {
    expect(revealOffset(400, 390, 400, 90)).toBe(400)
    expect(revealOffset(100, 390, 400, 90)).toBe(100)
  })

  // Centred, not flush to the edge: the strip snaps to whole tiles, and a flush rest is not
  // one — snapping would drag it back off the tile it was asked to show.
  it('centres a tile off the left edge', () => {
    expect(revealOffset(500, 390, 400, 90)).toBe(centreOffset(400, 90, 390))
  })

  it('centres a tile off the right edge', () => {
    expect(revealOffset(0, 390, 400, 90)).toBe(centreOffset(400, 90, 390))
  })

  it('never asks for a negative offset', () => {
    expect(revealOffset(50, 390, -20, 90)).toBe(0)
  })
})
