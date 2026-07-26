import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreWheel from '@/components/tournament/ScoreWheel.vue'

const base = { modelValue: 4, par: 4, name: 'Justin Rabe' }
const tiles = (w: ReturnType<typeof mount>) => w.findAll('[data-tile]')

describe('ScoreWheel', () => {
  // The wheel centres itself on mount; jsdom has no scrollTo, and no layout to assert on.
  const noScrollTo = !Element.prototype.scrollTo
  beforeAll(() => {
    if (noScrollTo) Element.prototype.scrollTo = () => {}
  })
  afterAll(() => {
    if (noScrollTo) Reflect.deleteProperty(Element.prototype, 'scrollTo')
  })

  it('picks out the selected stroke and fades the rest', () => {
    const w = mount(ScoreWheel, { props: base })

    const selected = tiles(w).filter((t) => t.classes().includes('text-mrc-ink'))
    expect(selected).toHaveLength(1)
    expect(selected[0].text()).toContain('4')
  })

  it('reads out the score against par when there is no round behind it', () => {
    const w = mount(ScoreWheel, { props: { ...base, modelValue: 6 } })

    expect(w.text()).toContain('6 (+2)')
  })

  it('reads out the running total including this hole', () => {
    // Three bogeys on par 4s, now sitting on par at the 4th: 15 + 4 against 16 of par.
    const w = mount(ScoreWheel, { props: { ...base, modelValue: 4, priorStrokes: 15, priorPar: 12 } })

    expect(w.text()).toContain('19 (+3)')
  })

  it('moves the total with the wheel', async () => {
    const w = mount(ScoreWheel, { props: { ...base, modelValue: 4, priorStrokes: 15, priorPar: 12 } })

    await w.setProps({ modelValue: 6 })

    expect(w.text()).toContain('21 (+5)')
  })

  it('reads under par as a negative running total', () => {
    const w = mount(ScoreWheel, { props: { ...base, modelValue: 3, priorStrokes: 11, priorPar: 12 } })

    expect(w.text()).toContain('14 (-2)')
  })

  it('greys every stroke when the hole was never scored', () => {
    // Centring on par is fine; picking it out is not — that reads as a par nobody made.
    const w = mount(ScoreWheel, { props: { ...base, unscored: true, readonly: true } })

    expect(tiles(w).filter((t) => t.classes().includes('text-mrc-ink'))).toHaveLength(0)
    expect(tiles(w).every((t) => t.classes().includes('text-mrc-line'))).toBe(true)
  })

  it('holds the running total at the last hole played when this one was never scored', () => {
    // The wheel sits on par but nobody made it, so neither the strokes nor the par count:
    // the readout is the round as it stood coming into the hole.
    const w = mount(ScoreWheel, { props: { ...base, unscored: true, readonly: true, priorStrokes: 15, priorPar: 12 } })

    expect(w.text()).toContain('15 (+3)')
  })

  it('does not emit when a readonly wheel is clicked', () => {
    const w = mount(ScoreWheel, { props: { ...base, readonly: true } })

    tiles(w)[5].trigger('click')

    expect(w.emitted('update:modelValue')).toBeUndefined()
  })
})
