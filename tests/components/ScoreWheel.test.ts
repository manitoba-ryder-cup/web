import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ScoreWheel from '@/components/tournament/ScoreWheel.vue'

const base = { modelValue: 4, par: 4, name: 'Justin Rabe' }
const tiles = (w: ReturnType<typeof mount>) => w.findAll('[data-tile]')

describe('ScoreWheel', () => {
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
    expect(tiles(w).every((t) => t.classes().includes('text-mrc-muted'))).toBe(true)
    expect(tiles(w).every((t) => t.attributes('aria-checked') === 'false')).toBe(true)
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
  // The wheel is one control, not twenty buttons. Only the selection is in the tab order,
  // so tabbing towards Save walks past four wheels rather than eighty tiles — and cannot
  // leave a score behind on the way, which is what focusing each tile used to do.
  it('is a single tab stop on the selected stroke', () => {
    const w = mount(ScoreWheel, { props: base })

    const tabbable = tiles(w).filter((t) => t.attributes('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].text()).toContain('4')
  })

  it('announces itself as one choice per player', () => {
    const w = mount(ScoreWheel, { props: base })

    expect(w.get('[role="radiogroup"]').attributes('aria-label')).toBe('Strokes for Justin Rabe')
    expect(tiles(w)[3].attributes('aria-checked')).toBe('true')
    expect(tiles(w)[4].attributes('aria-checked')).toBe('false')
  })

  it('moves the selection with the arrow keys', async () => {
    const w = mount(ScoreWheel, { props: base })

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([5])

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([3])
  })

  it('stops at the ends rather than wrapping', async () => {
    const w = mount(ScoreWheel, { props: { ...base, modelValue: 1 } })

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })

    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([1])
  })

  it('leaves the keys alone on a readonly wheel', async () => {
    const w = mount(ScoreWheel, { props: { ...base, readonly: true } })
    const e = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })

    w.get('[role="radiogroup"]').element.dispatchEvent(e)
    await nextTick()

    expect(w.emitted('update:modelValue')).toBeUndefined()
    // And the key still belongs to the page: a spectator pressing right expects to scroll,
    // not to have it swallowed by a wheel that was never going to move.
    expect(e.defaultPrevented).toBe(false)
  })

  // The wheel animates to the tile it was sent to, unless the reader asked for less.
  it('respects a request for less motion', async () => {
    const scrollTo = vi.fn()
    const original = Element.prototype.scrollTo
    Element.prototype.scrollTo = scrollTo as unknown as typeof original
    const reduced = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    try {
      const w = mount(ScoreWheel, { props: base })
      await nextTick()
      // Mounting scrolls to the opening stroke without animating; that call is not the
      // one under test, and reading the last call without clearing finds it instead.
      scrollTo.mockClear()

      await w.setProps({ modelValue: 7 })
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))

      reduced.mockReturnValue({ matches: false } as MediaQueryList)
      scrollTo.mockClear()
      await w.setProps({ modelValue: 9 })
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
    } finally {
      reduced.mockRestore()
      Element.prototype.scrollTo = original
    }
  })

  // Golf names them as far as golf has names for them, and no further than a tile holds:
  // "Double Bogey" overran 84px and was cut off mid-word.
  it('names the score over par the way the game does', () => {
    const w = mount(ScoreWheel, { props: base })
    const labels = w.findAll('[data-tile]').map((t) => t.text())

    expect(labels[4]).toContain('Bogey')
    expect(labels[5]).toContain('Double')
    expect(labels[6]).toContain('Triple')
    expect(labels[7]).toContain('Quadruple')
    expect(labels[8]).toContain('+5')
    expect(labels.some((l) => l.includes('Double Bogey'))).toBe(false)
  })

  // The numbers you are aiming past are dimmed, not erased. They used to be #e0e0e0 on
  // white — 1.32:1, nothing to aim at in sunlight — where the tile's own colour would put
  // them at 4.61:1 and barely tell them from the selection. The number carries the lighter
  // grey because at 63px it is large text; the word under it keeps the darker one.
  it('dims the strokes it is not sitting on without erasing them', () => {
    const w = mount(ScoreWheel, { props: base })
    const number = (t: typeof tiles extends (w: never) => (infer U)[] ? U : never) => t.findAll('span')[0]

    const selected = tiles(w).filter((t) => t.attributes('aria-checked') === 'true')
    const unselected = tiles(w).filter((t) => t.attributes('aria-checked') === 'false')

    expect(number(selected[0]).classes()).not.toContain('text-mrc-faint')
    expect(unselected.every((t) => number(t).classes().includes('text-mrc-faint'))).toBe(true)
    // Every number stays bold: weight is not what separates them.
    expect(tiles(w).every((t) => number(t).classes().includes('font-bold'))).toBe(true)
  })

  // Not colour alone: the bar under the chosen number is there or it is not.
  it('marks the selection with a bar as well as the ink', () => {
    const w = mount(ScoreWheel, { props: base })
    const bar = (i: number) => tiles(w)[i].findAll('span')[2]

    expect(bar(3).classes()).toContain('bg-mrc-accent')
    expect(bar(4).classes()).toContain('bg-transparent')
  })
})
