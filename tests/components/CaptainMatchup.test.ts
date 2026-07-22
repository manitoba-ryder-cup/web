import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CaptainMatchup from '@/components/tournament/CaptainMatchup.vue'
import type { TournamentTeam } from '@/api/types'

const teams: TournamentTeam[] = [
  { id: 't-blue', color: 'Blue', captain: { id: 'c1', first_name: 'Jon', last_name: 'Ray', email: null }, points: 0 },
  { id: 't-red', color: 'Red', captain: { id: 'c2', first_name: 'Harbs', last_name: 'Benning', email: null }, points: 0 },
]

describe('CaptainMatchup', () => {
  it("renders both captains' surnames in their team colours (blue left, red right)", () => {
    const w = mount(CaptainMatchup, { props: { teams } })
    expect(w.text()).toContain('Ray')
    expect(w.text()).toContain('Benning')
    expect(w.html()).toContain('text-mrc-blue-soft')
    expect(w.html()).toContain('text-mrc-red-soft')
  })

  it('renders the captains in white (no team colour) when white', () => {
    const w = mount(CaptainMatchup, { props: { teams, white: true } })
    expect(w.text()).toContain('Ray')
    expect(w.text()).toContain('Benning')
    expect(w.html()).not.toContain('text-mrc-blue-soft')
    expect(w.html()).not.toContain('text-mrc-red-soft')
  })
})
