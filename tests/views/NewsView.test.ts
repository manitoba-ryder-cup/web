import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import type { Article } from '@/lib/news'

const articles: Article[] = []
vi.mock('@/content', () => ({
  get allArticles() {
    return articles
  },
}))

import NewsView from '@/views/NewsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/news', component: { template: '<div/>' } },
    { path: '/news/:slug', name: 'article', component: { template: '<div/>' } },
  ],
})

const article = (o: Partial<Article> = {}): Article => ({
  slug: 'friday-fourball',
  title: 'Blue take the morning',
  summary: 'Three up after the first session.',
  published_at: '2026-09-18',
  cup: 2026,
  html: '<p>Body</p>',
  ...o,
})

const mountIt = (list: Article[]) => {
  articles.length = 0
  articles.push(...list)
  return mount(NewsView, { global: { plugins: [router] } })
}

describe('NewsView', () => {
  it('lists an article with the year it was written about', () => {
    const w = mountIt([article()])
    expect(w.text()).toContain('Blue take the morning')
    expect(w.text()).toContain('Three up after the first session.')
    expect(w.text()).toContain('2026')
    expect(w.get('a').attributes('href')).toBe('/news/friday-fourball')
  })

  it('groups by cup, newest cup first', () => {
    const w = mountIt([
      article({ slug: 'old', title: 'Older', cup: 2025, published_at: '2025-09-12' }),
      article({ slug: 'new', title: 'Newer', cup: 2026, published_at: '2026-09-18' }),
    ])
    const years: string[] = w.text().match(/20\d\d/g) ?? []
    expect(years.indexOf('2026')).toBeLessThan(years.indexOf('2025'))
    expect(w.text().indexOf('Newer')).toBeLessThan(w.text().indexOf('Older'))
  })

  // Nothing here is fetched, so "nothing written yet" can only ever be the truth — but it must
  // still not appear the moment one exists.
  it('says when nothing has been written, and stops saying it once something has', () => {
    expect(mountIt([]).text()).toContain('Nothing written yet')
    expect(mountIt([article()]).text()).not.toContain('Nothing written yet')
  })
})
