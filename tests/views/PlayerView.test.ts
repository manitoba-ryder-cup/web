import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'

vi.mock('@/api/scorecard', () => ({
  scorecardApi: {
    getPlayer: vi.fn().mockResolvedValue({
      id: 'p1', user_id: null, email: null, first_name: 'Jane', last_name: 'Doe',
      photo_path: '', record: { wins: 5, losses: 2, ties: 1 },
    }),
  },
}))

import PlayerView from '@/views/PlayerView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/players', name: 'players', component: { template: '<div/>' } },
    { path: '/players/:id', name: 'player', component: { template: '<div/>' } },
  ],
})

describe('PlayerView', () => {
  beforeEach(async () => { router.push('/players/p1'); await router.isReady() })
  it('renders the player name and W-L-T record', async () => {
    const w = mount(PlayerView, { props: { id: 'p1' }, global: { plugins: [router] } })
    await flushPromises()
    expect(w.text()).toContain('Jane Doe')
    expect(w.text()).toContain('5') // wins
    expect(w.text()).toContain('2') // losses
    expect(w.text()).toContain('1') // ties
  })
})
