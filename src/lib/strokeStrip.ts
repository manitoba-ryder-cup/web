// Where a stroke strip should sit. Kept out of the component because it is arithmetic, and
// because the component can only be asked about it through a layout jsdom does not have.

/** Puts a tile in the middle of the strip. Par gets this, so every player's strip lines up. */
export function centreOffset(tileLeft: number, tileWidth: number, viewportWidth: number): number {
  return Math.max(0, tileLeft + tileWidth / 2 - viewportWidth / 2)
}

/**
 * The least the strip must move for a tile to be wholly visible. Returns a scrollLeft for the
 * track alone, where scrollIntoView walks every ancestor and drags it under the sticky header.
 */
export function nudgeOffset(scrollLeft: number, viewportWidth: number, tileLeft: number, tileWidth: number): number {
  if (tileLeft < scrollLeft) return Math.max(0, tileLeft)
  if (tileLeft + tileWidth > scrollLeft + viewportWidth) return Math.max(0, tileLeft + tileWidth - viewportWidth)
  return scrollLeft
}
