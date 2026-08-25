import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import StrokePicker from '@/components/tournament/StrokePicker.vue'

const base = { modelValue: 4, par: 4, name: 'Justin Rabe' }
const tiles = (w: ReturnType<typeof mount>) => w.findAll('[data-stroke]')
const chosen = (w: ReturnType<typeof mount>) => tiles(w).filter((t) => t.attributes('aria-checked') === 'true')

// jsdom has no layout, so offsetLeft and clientWidth read 0 — but an assigned scrollLeft is
// kept, so stubbing the measurements makes where the strip parks observable.
const TILE = 90
const VIEWPORT = 390
async function withLayout(w: ReturnType<typeof mount>) {
  const track = w.get('[role="radiogroup"]').element as HTMLElement
  Object.defineProperty(track, 'clientWidth', { value: VIEWPORT, configurable: true })
  tiles(w).forEach((t, i) => {
    Object.defineProperty(t.element, 'offsetLeft', { value: i * TILE, configurable: true })
    Object.defineProperty(t.element, 'offsetWidth', { value: TILE, configurable: true })
  })
  // Mount settled against a layout of zeroes; a resize is how the strip is told there is
  // one now, and it is the same path a rotation takes.
  window.dispatchEvent(new Event('resize'))
  await nextTick()
  return track
}
const centreOf = (stroke: number) => (stroke - 1) * TILE + TILE / 2 - VIEWPORT / 2

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

  it('fills nothing when no score has been chosen', () => {
    // Sitting on par is fine; filling it is not — that reads as a par nobody made, and on a
    // live hole it is what Save would write.
    const w = mount(StrokePicker, { props: { ...base, modelValue: null } })

    expect(chosen(w)).toHaveLength(0)
    expect(tiles(w).every((t) => !t.classes().includes('bg-mrc-accent'))).toBe(true)
  })

  it('holds the running total at the last hole played while nothing is chosen', () => {
    const w = mount(StrokePicker, { props: { ...base, modelValue: null, priorStrokes: 15, priorPar: 12 } })

    expect(w.text()).toContain('15 (+3)')
  })

  // A radiogroup with nothing checked still has to be reachable, and par is where the strip
  // is already parked.
  it('keeps a tab stop on par while nothing is chosen', () => {
    const w = mount(StrokePicker, { props: { ...base, modelValue: null } })

    const tabbable = tiles(w).filter((t) => t.attributes('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].text()).toContain('4')
  })

  it('takes par on the first arrow rather than stepping past it', async () => {
    const w = mount(StrokePicker, { props: { ...base, modelValue: null } })

    await w.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })

    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([4])
  })

  it('leaves the strip parked on par when nothing is chosen', async () => {
    const w = mount(StrokePicker, { props: { ...base, par: 3, modelValue: null } })

    const track = await withLayout(w)

    expect(track.scrollLeft).toBe(centreOf(3))
  })

  it('does not emit when a readonly strip is tapped', () => {
    const w = mount(StrokePicker, { props: { ...base, readonly: true } })

    tiles(w)[5].trigger('click')

    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  // Only the chosen stroke is in the tab order, so tabbing towards Save walks one strip per
  // player rather than twenty tiles each, and cannot leave a score behind.
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

  // Par, not the score: it is what makes every strip share a column. Anchoring on the score
  // would line the fills up instead, losing what the layout carries.
  it('pins the strip to par, wherever the score sits', async () => {
    // A birdie, which is on screen once par is centred — so nothing nudges it afterwards
    // and the offset is purely the anchor. Anchored on the score it would be centreOf(3).
    const w = mount(StrokePicker, { props: { ...base, par: 4, modelValue: 3 } })

    const track = await withLayout(w)

    expect(track.scrollLeft).toBe(centreOf(4))
    expect(track.scrollLeft).not.toBe(centreOf(3))
  })

  // The same component is reused from hole to hole — same player, new par — so a strip
  // that only pinned itself on mount would drift out of column at the first par change.
  it('re-pins when the hole changes', async () => {
    const w = mount(StrokePicker, { props: { ...base, par: 4 } })
    const track = await withLayout(w)

    await w.setProps({ par: 3, modelValue: 3 })
    await nextTick()

    expect(track.scrollLeft).toBe(centreOf(3))
  })

  it('re-pins when the strip is resized', async () => {
    const w = mount(StrokePicker, { props: { ...base, par: 4 } })
    const track = await withLayout(w)
    track.scrollLeft = 0

    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(track.scrollLeft).toBe(centreOf(4))
  })

  // The property the column-reading rests on: choosing a stroke already on screen leaves
  // the strip exactly where it is.
  it('does not move when a visible stroke is chosen', async () => {
    const w = mount(StrokePicker, { props: { ...base, par: 4 } })
    const track = await withLayout(w)
    const parked = track.scrollLeft

    await w.setProps({ modelValue: 5 })
    await nextTick()

    expect(track.scrollLeft).toBe(parked)
  })

  it('brings a stroke off the end into view, no further', async () => {
    const w = mount(StrokePicker, { props: { ...base, par: 4 } })
    const track = await withLayout(w)

    await w.setProps({ modelValue: 12 })
    await nextTick()

    // Flush to the right edge rather than centred — the least the strip can move.
    expect(track.scrollLeft).toBe(11 * TILE + TILE - VIEWPORT)
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
