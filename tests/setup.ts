// jsdom implements no scrolling, so anything that centres itself on mount (the score
// wheel) throws on scrollTo. There is no layout to assert on either way — the tests that
// care about the wheel check which tile is selected, not where the track sits.
//
// Guarded because this file is setup for every suite, and the Worker tests run under the
// node environment where there is no DOM to patch.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}
