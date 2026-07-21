import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchResultsSection from '@/components/tournament/MatchResultsSection.vue'
import type { MatchResult } from '@/api/types'

function match(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    match_id: 'm1',
    format_name: 'Fourball',
    finished: true,
    winner_color: 'Red',
    lead: 3,
    holes_remaining: 2,
    red_players: [{ player_id: 'r1', first_name: 'Amy', last_name: 'Smith' }],
    blue_players: [{ player_id: 'b1', first_name: 'Bo', last_name: 'Jones' }],
    ...overrides,
  }
}

describe('MatchResultsSection', () => {
  const matches: MatchResult[] = [
    match({ match_id: 'm1', format_name: 'Fourball', winner_color: 'Red', lead: 3, holes_remaining: 2 }),
    match({ match_id: 'm2', format_name: 'Fourball', winner_color: 'Blue', lead: 2, holes_remaining: 0 }),
    match({ match_id: 'm3', format_name: 'Singles', finished: false, winner_color: '' }),
  ]

  it('groups matches by format in first-appearance order', () => {
    const w = mount(MatchResultsSection, { props: { matches } })
    const headers = w.findAll('h4').map((h) => h.text())
    expect(headers).toEqual(['Fourball', 'Singles'])
  })

  it('renders a row per match with player names', () => {
    const w = mount(MatchResultsSection, { props: { matches } })
    const text = w.text()
    expect(text).toContain('Amy Smith')
    expect(text).toContain('Bo Jones')
  })

  it('shows the margin for a finished match and "In progress" for an unfinished one', () => {
    const w = mount(MatchResultsSection, { props: { matches } })
    const text = w.text()
    expect(text).toContain('3 & 2')
    expect(text).toContain('2 up')
    expect(text).toContain('In progress')
  })

  it('tints the winning side', () => {
    const w = mount(MatchResultsSection, { props: { matches: [matches[0]] } })
    // Red won → the red side (last of the two player divs) carries the red-team tint.
    expect(w.html()).toContain('bg-mrc-red-team')
    expect(w.html()).not.toContain('bg-mrc-blue-team')
  })
})
