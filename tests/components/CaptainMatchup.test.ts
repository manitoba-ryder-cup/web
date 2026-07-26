import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'
import type { TournamentTeam } from '@/api/types'

const teams: TournamentTeam[] = [
  { id: 't-blue', color: 'Blue', captain: { id: 'c1', first_name: 'Jon', last_name: 'Ray' }, points: 0 },
  { id: 't-red', color: 'Red', captain: { id: 'c2', first_name: 'Harbs', last_name: 'Benning' }, points: 0 },
]

describe('CaptainMatchup', () => {
  it("renders both captains' surnames in their team colours (blue left, red right)", () => {
    const w = mount(CaptainMatchup, { props: { teams } })
    expect(w.text()).toContain('Ray')
    expect(w.text()).toContain('Benning')
    expect(w.html()).toContain('text-mrc-blue-soft')
    expect(w.html()).toContain('text-mrc-red-soft')
  })

  it('renders the teams in the order given — ordering is the boundary\'s job, not this component\'s', () => {
    const redFirst: TournamentTeam[] = [
      { id: 'a-red', color: 'Red', captain: { id: 'c2', first_name: 'Harbs', last_name: 'Benning' }, points: 0 },
      { id: 'z-blue', color: 'Blue', captain: { id: 'c1', first_name: 'Jon', last_name: 'Ray' }, points: 0 },
    ]
    const t = mount(CaptainMatchup, { props: { teams: redFirst } }).text()
    expect(t.indexOf('Benning')).toBeLessThan(t.indexOf('Ray'))
  })

  it('renders the captains in white (no team colour) when white', () => {
    const w = mount(CaptainMatchup, { props: { teams, white: true } })
    expect(w.text()).toContain('Ray')
    expect(w.text()).toContain('Benning')
    expect(w.html()).not.toContain('text-mrc-blue-soft')
    expect(w.html()).not.toContain('text-mrc-red-soft')
  })
})
