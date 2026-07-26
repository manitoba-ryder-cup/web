// jsdom implements no scrolling, so anything that centres itself on mount (the score
// wheel) throws on scrollTo. There is no layout to assert on either way — the tests that
// care about the wheel check which tile is selected, not where the track sits.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}
