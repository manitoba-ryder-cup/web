import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerAvatar from '@/components/player/PlayerAvatar.vue'

const DEFAULT = '/img/default-avatar.webp'
describe('PlayerAvatar', () => {
  it('falls back to the default when photoPath is empty', () => {
    const w = mount(PlayerAvatar, { props: { photoPath: '' } })
    expect(w.get('img').attributes('src')).toBe(DEFAULT)
  })
  it('uses the given photoPath when present', () => {
    const w = mount(PlayerAvatar, { props: { photoPath: '/x.jpg' } })
    expect(w.get('img').attributes('src')).toBe('/x.jpg')
  })
  it('falls back to the default after a load error', async () => {
    const w = mount(PlayerAvatar, { props: { photoPath: '/x.jpg' } })
    await w.get('img').trigger('error')
    expect(w.get('img').attributes('src')).toBe(DEFAULT)
  })
})
