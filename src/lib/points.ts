// Cup points come in halves — a halved match is worth ½ a point to each side — so a total
// renders as a whole number with an optional ½. Kept split from the string form because
// the standings bar sizes the fraction smaller than the whole.
export function splitPoints(points: number | undefined): { whole: number; half: boolean } {
  const p = points ?? 0
  return { whole: Math.trunc(p), half: p % 1 !== 0 }
}

export function pointsText(points: number | undefined): string {
  const { whole, half } = splitPoints(points)
  return half ? `${whole}½` : `${whole}`
}
