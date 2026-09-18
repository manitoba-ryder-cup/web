import { describe, it, expect } from 'vitest'
import { byNewest, latest, groupByCup, findBySlug, type Article } from '@/lib/news'

const article = (o: Partial<Article> = {}): Article => ({
  slug: 'a',
  title: 'A',
  summary: 'S',
  published_at: '2026-09-18',
  cup: 2026,
  html: '<p>A</p>',
  ...o,
})

describe('news', () => {
  it('reads newest first', () => {
    const out = byNewest([
      article({ slug: 'mid', published_at: '2026-09-18' }),
      article({ slug: 'old', published_at: '2025-09-12' }),
      article({ slug: 'new', published_at: '2026-09-19' }),
    ])
    expect(out.map((a) => a.slug)).toEqual(['new', 'mid', 'old'])
  })

  // Two recaps a day is the ordinary case — a session each — and the afternoon one is the newer.
  // A date alone cannot say that, so the time is what orders them.
  it('puts the afternoon session above the morning one', () => {
    const day = [
      article({ slug: 'fourball', published_at: '2026-09-18T13:00' }),
      article({ slug: 'scotch', published_at: '2026-09-18T20:00' }),
    ]
    expect(byNewest(day).map((a) => a.slug)).toEqual(['scotch', 'fourball'])
    expect(byNewest([...day].reverse()).map((a) => a.slug)).toEqual(['scotch', 'fourball'])
  })

  // Only when two carry the very same stamp does anything else decide, and then it must not be
  // whichever the filesystem handed over first.
  it('settles an identical stamp on the slug rather than on load order', () => {
    const same = [article({ slug: 'scotch' }), article({ slug: 'fourball' })]
    expect(byNewest(same).map((a) => a.slug)).toEqual(['fourball', 'scotch'])
    expect(byNewest([...same].reverse()).map((a) => a.slug)).toEqual(['fourball', 'scotch'])
  })

  it('takes the newest few for the homepage', () => {
    const many = ['2026-09-19', '2026-09-18', '2025-09-13', '2025-09-12'].map((d) => article({ slug: d, published_at: d }))
    expect(latest(many, 3).map((a) => a.slug)).toEqual(['2026-09-19', '2026-09-18', '2025-09-13'])
    expect(latest(many, 10)).toHaveLength(4)
    expect(latest([], 3)).toEqual([])
  })

  it('groups by the cup written about, newest cup first', () => {
    const groups = groupByCup([
      article({ slug: 'a', cup: 2025, published_at: '2025-09-12' }),
      article({ slug: 'b', cup: 2026, published_at: '2026-09-18' }),
      article({ slug: 'c', cup: 2026, published_at: '2026-09-19' }),
    ])
    expect(groups.map((g) => g.cup)).toEqual([2026, 2025])
    expect(groups[0].articles.map((a) => a.slug)).toEqual(['c', 'b'])
  })

  it('finds one by slug, and says so when there is none', () => {
    const all = [article({ slug: 'friday-fourball' })]
    expect(findBySlug(all, 'friday-fourball')?.slug).toBe('friday-fourball')
    expect(findBySlug(all, 'nope')).toBeNull()
  })
})
