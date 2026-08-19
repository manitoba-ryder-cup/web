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

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('offers to reveal the password', () => {
    const w = mount(LoginView, { global: { plugins: [router, createPinia()] } })
    expect(w.find('input[placeholder="Password"]').attributes('type')).toBe('password')
    expect(w.find('button[aria-label="Show password"]').exists()).toBe(true)
  })

  // The password field is wrapped now, so the listener sits on the wrapper and depends on
  // the keyup bubbling out of the input.
  it('still submits when enter is pressed in the password field', async () => {
    const w = mount(LoginView, { global: { plugins: [router, createPinia()] } })
    expect(w.text()).not.toContain('Email and password are required')

    await w.find('input[placeholder="Password"]').trigger('keyup.enter')

    expect(w.text()).toContain('Email and password are required')
  })
})
