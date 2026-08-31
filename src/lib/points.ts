// A halved match is ½ a point each, so a total renders as a whole with an optional ½ — split
// rather than handed over as a string so a caller can size the fraction apart from the whole.
export function splitPoints(points: number | undefined): { whole: number; half: boolean } {
  const p = points ?? 0
  return { whole: Math.trunc(p), half: p % 1 !== 0 }
}
