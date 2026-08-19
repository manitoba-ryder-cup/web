import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_TOURNAMENTS_WRITE, SCOPE_SCORES_WRITE } from '@/api/scopes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div/>' } },
    { path: '/tournaments', name: 'tournaments', component: { template: '<div/>' } },
    { path: '/dashboard', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/login', name: 'login', component: { template: '<div/>' } },
  ],
})

describe('AppHeader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows Login (not Logout) when logged out, plus News + History', async () => {
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    expect(w.text()).toContain('Login')
    expect(w.text()).not.toContain('Logout')
    expect(w.text()).toContain('News')
    expect(w.text()).toContain('History')
  })

  it('opens the drawer when the hamburger is clicked', async () => {
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    // drawer starts translated off-screen
    expect(w.find('aside').classes()).toContain('translate-x-full')
    await w.get('button[aria-label="Open menu"]').trigger('click')
    expect(w.find('aside').classes()).toContain('translate-x-0')
  })

  it('shows Logout (not Login) when authenticated', async () => {
    const auth = useAuthStore()
    auth.user = { id: '1', email: 'a@b.c', first_name: 'A', last_name: 'B' } as never
    // isAuthenticated derives from accessToken !== null (see src/stores/auth.ts)
    auth.accessToken = 'tok'
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    expect(w.text()).toContain('Logout')
    expect(w.text()).not.toContain('Login')
  })

  // Being signed in is not the test for the admin area: a scorer holds a write scope and
  // still has no business in tournament setup. Offering the link and having the API refuse
  // is a worse answer than not offering it.
  it('hides Admin from a signed-in user whose token lacks the scope', async () => {
    const auth = useAuthStore()
    auth.accessToken = tokenWithScopes([SCOPE_SCORES_WRITE])
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    expect(w.text()).toContain('Logout')
    expect(w.text()).not.toContain('Admin')
  })

  it('shows Admin when the token carries the scope', async () => {
    const auth = useAuthStore()
    auth.accessToken = tokenWithScopes([SCOPE_TOURNAMENTS_WRITE])
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { global: { plugins: [router] } })
    expect(w.text()).toContain('Admin')
  })

  // The drawer's three close paths (backdrop, Esc, route change) are the trickiest
  // part of NavDrawer, so each gets its own regression test.
  async function openDrawer() {
    router.push('/')
    await router.isReady()
    const w = mount(AppHeader, { attachTo: document.body, global: { plugins: [router] } })
    await w.get('button[aria-label="Open menu"]').trigger('click')
    expect(w.find('aside').classes()).toContain('translate-x-0')
    return w
  }

  it('closes the drawer when the backdrop is clicked', async () => {
    const w = await openDrawer()
    await w.get('.fixed.inset-0').trigger('click')
    expect(w.find('aside').classes()).toContain('translate-x-full')
  })

  it('closes the drawer on Escape', async () => {
    const w = await openDrawer()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.find('aside').classes()).toContain('translate-x-full')
  })

  it('closes the drawer on route change', async () => {
    const w = await openDrawer()
    await router.push('/tournaments')
    await w.vm.$nextTick()
    expect(w.find('aside').classes()).toContain('translate-x-full')
  })
})

function tokenWithScopes(scopes: string[]): string {
  const body = btoa(JSON.stringify({ scopes })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${body}.signature`
}
