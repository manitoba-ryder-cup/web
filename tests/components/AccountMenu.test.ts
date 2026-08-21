import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AccountMenu from '@/components/layout/AccountMenu.vue'
import { useAuthStore } from '@/stores/auth'
import { SCOPE_TOURNAMENTS_WRITE, SCOPE_SCORES_WRITE } from '@/api/scopes'
import { tokenWithScopes } from '../support/token'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/players', name: 'players', component: { template: '<div/>' } },
    { path: '/admin', name: 'admin', component: { template: '<div/>' } },
    { path: '/login', name: 'login', component: { template: '<div/>' } },
  ],
})

async function mountMenu() {
  await router.push('/')
  await router.isReady()
  return mount(AccountMenu, { attachTo: document.body, global: { plugins: [router] } })
}

async function signedIn(scopes: string[] = []) {
  useAuthStore().accessToken = tokenWithScopes(scopes)
  const w = await mountMenu()
  await w.get('button[aria-label="Account"]').trigger('click')
  return w
}

describe('AccountMenu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // Both states sit in the top corner, which is the hardest place on a phone to hit, so
  // each has to be at least a finger tall — and they are two different elements.
  // Sized in px, not rems. The root font-size is 14px below md, so min-h-11 renders 38.5
  // there — a class that reads as 44 and misses it on exactly the screens the minimum is
  // for, in the corner of the screen hardest to reach.
  it('gives the login link a full tap target', async () => {
    expect((await mountMenu()).get('a').classes()).toContain('min-h-[44px]')
  })

  it('gives the account button a full tap target', async () => {
    useAuthStore().accessToken = tokenWithScopes([])
    const w = await mountMenu()
    expect(w.get('button[aria-label="Account"]').classes()).toContain('min-h-[44px]')
  })

  // Signed out there is exactly one thing to do, so a menu holding a single item is one
  // tap of ceremony — the control is the link.
  it('is a direct link to login when signed out', async () => {
    const w = await mountMenu()
    expect(w.get('a').attributes('href')).toBe('/login')
    expect(w.find('button[aria-label="Account"]').exists()).toBe(false)
  })

  it('opens a menu with Logout when signed in', async () => {
    const w = await signedIn()
    expect(w.text()).toContain('Logout')
  })

  it('stays closed until the button is tapped', async () => {
    useAuthStore().accessToken = tokenWithScopes([])
    const w = await mountMenu()
    expect(w.text()).not.toContain('Logout')
  })

  // Being signed in is not the test for the admin area: a scorer holds a write scope and
  // still has no business in tournament setup. Offering the link and having the API refuse
  // is a worse answer than not offering it.
  it('hides Admin from a signed-in user whose token lacks the scope', async () => {
    const w = await signedIn([SCOPE_SCORES_WRITE])
    expect(w.text()).toContain('Logout')
    expect(w.text()).not.toContain('Admin')
  })

  it('shows Admin when the token carries the scope', async () => {
    const w = await signedIn([SCOPE_TOURNAMENTS_WRITE])
    expect(w.text()).toContain('Admin')
  })

  // The menu's three close paths are the trickiest part of it, so each gets its own test.
  it('closes when the backdrop is clicked', async () => {
    const w = await signedIn()
    await w.get('[data-testid="backdrop"]').trigger('click')
    expect(w.text()).not.toContain('Logout')
  })

  it('closes on Escape', async () => {
    const w = await signedIn()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.text()).not.toContain('Logout')
  })

  it('closes on route change', async () => {
    const w = await signedIn([SCOPE_TOURNAMENTS_WRITE])
    await router.push('/players')
    await w.vm.$nextTick()
    expect(w.text()).not.toContain('Admin')
  })
})
