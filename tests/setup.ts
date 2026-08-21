// jsdom implements no scrolling, so anything that positions itself on mount (the stroke
// strip) throws on scrollTo. There is no layout to assert on either way — the tests that
// care about the strip check which tile is selected, not where the track sits.
//
// Guarded because this file is setup for every suite, and the Worker tests run under the
// node environment where there is no DOM to patch.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
