import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/forgot-password', name: 'forgot-password', component: { template: '<div/>' } },
  ],
})

function mountLogin() {
  return mount(LoginView, { global: { plugins: [router, createPinia()] } })
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('masks the password until asked to show it, and masks it again', async () => {
    const w = mountLogin()
    const field = () => w.find('input[placeholder="Password"]')
    const toggle = () => w.find('button[aria-label$="password"]')

    expect(field().attributes('type')).toBe('password')
    expect(toggle().attributes('aria-label')).toBe('Show password')

    await toggle().trigger('click')

    expect(field().attributes('type')).toBe('text')
    expect(toggle().attributes('aria-label')).toBe('Hide password')

    await toggle().trigger('click')

    expect(field().attributes('type')).toBe('password')
  })

  it('keeps what was typed when the password is revealed', async () => {
    const w = mountLogin()
    await w.find('input[placeholder="Password"]').setValue('correct-horse-battery')

    await w.find('button[aria-label$="password"]').trigger('click')

    const field = w.find('input[placeholder="Password"]')
    expect(field.attributes('type')).toBe('text')
    expect((field.element as HTMLInputElement).value).toBe('correct-horse-battery')
  })

  // Not type="submit": the button sits beside the password field, and a stray submit would
  // send a half-filled form instead of revealing anything.
  it('does not submit the form', () => {
    expect(mountLogin().find('button[aria-label$="password"]').attributes('type')).toBe('button')
  })
})
