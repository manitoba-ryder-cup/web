// An article as the build hands it over: frontmatter, plus the body already rendered. `cup` is
// the year written about, not a tournament id — ids differ between environments, a year does not.
export interface Article {
  slug: string
  title: string
  summary: string
  published_at: string
  cup: number
  html: string
}

export function byNewest(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => b.published_at.localeCompare(a.published_at) || a.slug.localeCompare(b.slug))
}

export function latest(articles: Article[], count: number): Article[] {
  return byNewest(articles).slice(0, count)
}

// Newest cup first, and newest article within it, so the page reads as a run of cups backwards.
export function groupByCup(articles: Article[]): { cup: number; articles: Article[] }[] {
  const cups = new Map<number, Article[]>()
  for (const a of byNewest(articles)) {
    const group = cups.get(a.cup)
    if (group) group.push(a)
    else cups.set(a.cup, [a])
  }
  return [...cups.entries()].sort(([a], [b]) => b - a).map(([cup, group]) => ({ cup, articles: group }))
}

export function findBySlug(articles: Article[], slug: string): Article | null {
  return articles.find((a) => a.slug === slug) ?? null
}
