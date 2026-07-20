import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StandingsBar from '@/components/tournament/StandingsBar.vue'
import WinnerBanner from '@/components/tournament/WinnerBanner.vue'
import TeamStandingPanel from '@/components/tournament/TeamStandingPanel.vue'

describe('StandingsBar', () => {
  it('splits 50/50 when there are no points', () => {
    const w = mount(StandingsBar, { props: { bluePoints: 0, redPoints: 0 } })
    expect((w.find('div > div').element as HTMLElement).style.width).toBe('50%')
  })
  it('sizes the blue fill by its share', () => {
    const w = mount(StandingsBar, { props: { bluePoints: 3, redPoints: 1 } })
    expect((w.find('div > div').element as HTMLElement).style.width).toBe('75%')
  })
})

describe('WinnerBanner', () => {
  it('renders the winning color', () => {
    expect(mount(WinnerBanner, { props: { winnerColor: 'Red' } }).text()).toContain('Red')
  })
  it('renders Tied', () => {
    expect(mount(WinnerBanner, { props: { winnerColor: 'Tied' } }).text()).toContain('Tied')
  })
  it('renders In progress when null', () => {
    expect(mount(WinnerBanner, { props: { winnerColor: null } }).text()).toContain('In progress')
  })
})

describe('TeamStandingPanel', () => {
  it('shows the captain and points', () => {
    const w = mount(TeamStandingPanel, { props: { color: 'Blue', captain: 'Jane Doe', points: 4.5 } })
    expect(w.text()).toContain('Jane Doe')
    expect(w.text()).toContain('4.5')
  })
})
