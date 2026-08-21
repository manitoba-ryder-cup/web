// jsdom implements no scrolling, so anything that centres itself on mount (the score
// wheel) throws on scrollTo. There is no layout to assert on either way — the tests that
// care about the wheel check which tile is selected, not where the track sits.
//
// Guarded because this file is setup for every suite, and the Worker tests run under the
// node environment where there is no DOM to patch.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}

// jsdom implements no media queries either, and the score wheel asks whether the reader
// wants less motion before it animates. Answering "no" is the default a browser gives.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
