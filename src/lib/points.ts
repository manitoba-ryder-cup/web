// A halved match is ½ a point each, so a total renders as a whole with an optional ½. Split
// from the string form because the standings bar sizes the fraction smaller.
export function splitPoints(points: number | undefined): { whole: number; half: boolean } {
  const p = points ?? 0
  return { whole: Math.trunc(p), half: p % 1 !== 0 }
}

export function pointsText(points: number | undefined): string {
  const { whole, half } = splitPoints(points)
  return half ? `${whole}½` : `${whole}`
}
