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

import ArticleView from '@/views/ArticleView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/news', name: 'news', component: { template: '<div/>' } }],
})

const article: Article = {
  slug: 'friday-fourball',
  title: 'Blue take the morning',
  summary: 'Three up after the first session.',
  published_at: '2026-09-18',
  cup: 2026,
  html: '<p>Rabe and Zander closed it out on the seventeenth.</p>',
}

const mountIt = (slug: string) => {
  articles.length = 0
  articles.push(article)
  return mount(ArticleView, { props: { slug }, global: { plugins: [router] } })
}

describe('ArticleView', () => {
  it('renders the body the build produced', () => {
    const w = mountIt('friday-fourball')
    expect(w.text()).toContain('Rabe and Zander closed it out on the seventeenth.')
    expect(w.get('.article').html()).toContain('<p>')
  })

  // Unsigned on purpose: the same name on every piece said nothing. The year, not a formatted
  // date — jsdom's locale is not the reader's, and formatDate is what guards the formatting.
  it('carries the date and no byline', () => {
    const w = mountIt('friday-fourball')
    expect(w.text()).toContain('2026')
    expect(w.text()).not.toContain('Travis Bale')
  })

  // A slug that never existed and one that has been unpublished look the same from here.
  it('says so when there is no such article', () => {
    const w = mountIt('never-written')
    expect(w.text()).toContain('That article does not exist')
    expect(w.text()).not.toContain('Rabe and Zander')
  })

  it('does not show the not-found copy for an article that is there', () => {
    expect(mountIt('friday-fourball').text()).not.toContain('That article does not exist')
  })
})
