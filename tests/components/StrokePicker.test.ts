import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StrokePicker from '@/components/tournament/StrokePicker.vue'

const base = { modelValue: 4, par: 4, name: 'Justin Rabe' }
const tiles = (w: ReturnType<typeof mount>) => w.findAll('[data-stroke]')
const chosen = (w: ReturnType<typeof mount>) => tiles(w).filter((t) => t.attributes('aria-checked') === 'true')

// Not covered here: that the strips line up on par across players, which is what lets a
// hole be read down the column. It is a layout fact, and jsdom reports every offsetLeft as
// 0 — anchoring on par and anchoring on the score compute the same number under test. It
// is checked in a browser instead; see the commit that introduced it.
describe('StrokePicker', () => {
  it('fills the chosen stroke and leaves the rest plain', () => {
    const picked = chosen(mount(StrokePicker, { props: base }))

    expect(picked).toHaveLength(1)
    expect(picked[0].text()).toContain('4')
    expect(picked[0].classes()).toContain('bg-mrc-accent')
  })

  // The strip is legible because the fill marks the choice: nothing has to be dimmed to
  // tell it from the rest, which is what the control this replaced had to do.
  it('leaves every stroke readable, not just the chosen one', () => {
    const w = mount(StrokePicker, { props: base })

    expect(tiles(w).every((t) => t.classes().includes('bg-mrc-accent') || t.classes().includes('text-mrc-charcoal'))).toBe(true)
  })

  it('reads out the score against par when there is no round behind it', () => {
    expect(mount(StrokePicker, { props: { ...base, modelValue: 6 } }).text()).toContain('6 (+2)')
  })

  it('reads out the running total including this hole', () => {
    // Three bogeys on par 4s, now sitting on par at the 4th: 15 + 4 against 16 of par.
    expect(mount(StrokePicker, { props: { ...base, priorStrokes: 15, priorPar: 12 } }).text()).toContain('19 (+3)')
  })

  it('moves the total with the choice', async () => {
    const w = mount(StrokePicker, { props: { ...base, priorStrokes: 15, priorPar: 12 } })

    await w.setProps({ modelValue: 6 })

    expect(w.text()).toContain('21 (+5)')
  })

  it('reads under par as a negative running total', () => {
    expect(mount(StrokePicker, { props: { ...base, modelValue: 3, priorStrokes: 11, priorPar: 12 } }).text()).toContain('14 (-2)')
  })

  it('fills nothing when the hole was never scored', () => {
    // Sitting on par is fine; filling it is not — that reads as a par nobody made.
    const w = mount(StrokePicker, { props: { ...base, unscored: true, readonly: true } })

    expect(chosen(w)).toHaveLength(0)
    expect(tiles(w).every((t) => !t.classes().includes('bg-mrc-accent'))).toBe(true)
  })

  it('holds the running total at the last hole played when this one was never scored', () => {
    const w = mount(StrokePicker, { props: { ...base, unscored: true, readonly: true, priorStrokes: 15, priorPar: 12 } })

    expect(w.text()).toContain('15 (+3)')
  })

  it('does not emit when a readonly strip is tapped', () => {
    const w = mount(StrokePicker, { props: { ...base, readonly: true } })

    tiles(w)[5].trigger('click')

    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  // Twenty tiles, one control. Only the chosen stroke is in the tab order, so tabbing
  // towards Save walks past one strip per player rather than twenty tiles each — and
  // cannot leave a score behind on the way.
  it('is a single tab stop on the chosen stroke', () => {
    const w = mount(StrokePicker, { props: base })

    const tabbable = tiles(w).filter((t) => t.attributes('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].text()).toContain('4')
  })

  it('announces itself as one choice per player', () => {
    const w = mount(StrokePicker, { props: base })

    expect(w.get('[role="radiogroup"]').attributes('aria-label')).toBe('Strokes for Justin Rabe')
    expect(tiles(w)[3].attributes('aria-checked')).toBe('true')
    expect(tiles(w)[4].attributes('aria-checked')).toBe('false')
  })

  it('moves the choice with the arrow keys', async () => {
    const w = mount(StrokePicker, { props: base })

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([5])

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([3])
  })

  it('stops at the ends rather than wrapping', async () => {
    const w = mount(StrokePicker, { props: { ...base, modelValue: 1 } })

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })

    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([1])
  })

  it('leaves the keys to the page on a readonly strip', async () => {
    const w = mount(StrokePicker, { props: { ...base, readonly: true } })
    const e = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })

    w.get('[role="radiogroup"]').element.dispatchEvent(e)

    expect(w.emitted('update:modelValue')).toBeUndefined()
    // A spectator pressing right expects to scroll, not to have it swallowed by a strip
    // that was never going to move.
    expect(e.defaultPrevented).toBe(false)
  })

  // Scrolling browses; it never records. The control this replaced read whatever the
  // scroll centred, which is how a stray drag or a focus could enter a score nobody chose.
  it('has nothing listening to the scroll', () => {
    const w = mount(StrokePicker, { props: base })

    w.get('[role="radiogroup"]').trigger('scroll')

    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('names the score over par the way the game does', () => {
    const labels = tiles(mount(StrokePicker, { props: base })).map((t) => t.text())

    expect(labels[4]).toContain('Bogey')
    expect(labels[5]).toContain('Double')
    expect(labels[6]).toContain('Triple')
    // Past triple the number says it: "Quadruple" overruns the tile and is 0.2% of scores.
    expect(labels[7]).toContain('+4')
    expect(labels.some((l) => l.includes('Quadruple'))).toBe(false)
  })

  it('names a score under par by the shot that made it', () => {
    const labels = tiles(mount(StrokePicker, { props: { ...base, par: 5 } })).map((t) => t.text())

    expect(labels[0]).toContain('Ace')
    expect(labels[1]).toContain('Albatross')
    expect(labels[2]).toContain('Eagle')
    expect(labels[3]).toContain('Birdie')
    expect(labels[4]).toContain('Par')
  })
})
