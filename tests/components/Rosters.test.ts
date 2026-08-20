import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import Rosters from '@/components/tournament/Rosters.vue'
import type { TournamentPlayer, TournamentTeam } from '@/api/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/players/:id', name: 'player', component: { template: '<div/>' } }],
})

const teams: TournamentTeam[] = [
  { id: 'blue', color: 'Blue', captain: { id: 'c-blue', first_name: 'Jon', last_name: 'Ray' }, points: 0 },
  { id: 'red', color: 'Red', captain: { id: 'c-red', first_name: 'Harbs', last_name: 'Benning' }, points: 0 },
]

function player(o: Partial<TournamentPlayer> & { player_id: string; first_name: string; last_name: string }): TournamentPlayer {
  return {
    tournament_id: 't1',
    tier: 'gold',
    biography: '',
    hdcp: 4,
    photo_path: '',
    team_id: 'blue',
    record: { wins: 0, losses: 0, ties: 0 },
    cups_won: 0,
    ...o,
  }
}

// Each captain is entered like anyone else, and sorts by surname among his own gold flight.
// Deliberately out of order, so a sheet that just echoed the input would fail.
const players: TournamentPlayer[] = [
  player({ player_id: 'p2', first_name: 'Zed', last_name: 'Zubek' }),
  player({ player_id: 'p4', first_name: 'Ab', last_name: 'Early', tier: 'silver' }),
  player({ player_id: 'c-blue', first_name: 'Jon', last_name: 'Ray' }),
  player({ player_id: 'p1', first_name: 'Al', last_name: 'Aaronson' }),
  player({ player_id: 'c-red', first_name: 'Harbs', last_name: 'Benning', team_id: 'red' }),
  player({ player_id: 'p5', first_name: 'Cy', last_name: 'Crane', team_id: 'red' }),
  player({ player_id: 'p3', first_name: 'Ann', last_name: 'Ashley', team_id: 'red' }),
]

const mountSheet = () => mount(Rosters, { props: { players, teams }, global: { plugins: [router] } })
type Sheet = ReturnType<typeof mountSheet>

const column = (w: Sheet, i: number) => w.findAll('.grid > div')[i]
const heading = (w: Sheet, i: number) => column(w, i).find('div')
// The avatar's alt is the full name, and unlike the row's own text it isn't run together
// with the record.
const names = (w: Sheet, i: number) =>
  column(w, i)
    .findAll('li img')
    .map((img) => img.attributes('alt'))

describe('Rosters', () => {
  it('leads each column with its captain', () => {
    const w = mountSheet()

    expect(names(w, 0)[0]).toBe('Jon Ray')
    expect(names(w, 1)[0]).toBe('Harbs Benning')
  })

  it('keeps the captain in the roster he leads', () => {
    const w = mountSheet()

    // He heads the column and is still one of its players — the sheet is the whole team.
    // Early is silver, so he stays behind the gold flight rather than jumping the captain.
    expect(names(w, 0)).toEqual(['Jon Ray', 'Al Aaronson', 'Zed Zubek', 'Ab Early'])
  })

  it('sorts the rest by surname behind him', () => {
    const w = mountSheet()

    expect(names(w, 1)).toEqual(['Harbs Benning', 'Ann Ashley', 'Cy Crane'])
  })

  it('heads each column with the captain, in that team’s colour', () => {
    const w = mountSheet()

    expect(heading(w, 0).text()).toBe('Team Ray')
    expect(heading(w, 0).classes()).toContain('text-mrc-blue-strong')
    expect(heading(w, 1).text()).toBe('Team Benning')
    expect(heading(w, 1).classes()).toContain('text-mrc-red-strong')
  })
})
