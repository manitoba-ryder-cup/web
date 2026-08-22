import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/scorecard', () => ({ scorecardApi: { listTournaments: vi.fn() } }))

import { createRouter, createWebHistory } from 'vue-router'
import { scorecardApi } from '@/api/scorecard'
import AdminView from '@/views/admin/AdminView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/admin/:id', name: 'admin-tournament', component: { template: '<div/>' } }],
})

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(scorecardApi.listTournaments).mockResolvedValue([
      { id: 't1', name: 'Summer Cup', start_date: '2026-07-01', end_date: '2026-07-03', location: 'Winnipeg', phase: 'upcoming' },
    ])
  })

  it('shows a skeleton while loading, not the empty-state copy', async () => {
    const w = mount(AdminView, { global: { plugins: [router] } })

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(w.text()).not.toContain('No tournaments yet.')

    await flushPromises()

    expect(w.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(w.text()).toContain('Winnipeg')
  })
})
