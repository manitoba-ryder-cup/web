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

  it('makes a tab per format in first-appearance order', () => {
    const w = mount(MatchResultsSection, { props: { matches } })
    const tabs = w.findAll('button').map((b) => b.text())
    expect(tabs).toEqual(['Fourball', 'Singles'])
  })

  it('renders a row per match with player names', () => {
    const w = mount(MatchResultsSection, { props: { matches } })
    const text = w.text()
    expect(text).toContain('Amy Smith')
    expect(text).toContain('Bo Jones')
  })

  it('shows margins on the active tab and "In progress" after switching tabs', async () => {
    const w = mount(MatchResultsSection, { props: { matches } })
    // Fourball tab is active by default (m1 → "3 & 2", m2 → "2 up").
    expect(w.text()).toContain('3 & 2')
    expect(w.text()).toContain('2 up')
    // The in-progress match is on the Singles tab.
    const singles = w.findAll('button').find((b) => b.text() === 'Singles')!
    await singles.trigger('click')
    expect(w.text()).toContain('In progress')
  })

  it('tints the winning side', () => {
    const w = mount(MatchResultsSection, { props: { matches: [matches[0]] } })
    // Red won → the red side (last of the two player divs) carries the red-team tint.
    expect(w.html()).toContain('bg-mrc-red-team')
    expect(w.html()).not.toContain('bg-mrc-blue-team')
  })
})
