// Where a stroke strip should sit. Kept out of the component because it is arithmetic, and
// because the component can only be asked about it through a layout jsdom does not have.

/** Puts a tile in the middle of the strip. Par gets this, so every player's strip lines up. */
export function centreOffset(tileLeft: number, tileWidth: number, viewportWidth: number): number {
  return Math.max(0, tileLeft + tileWidth / 2 - viewportWidth / 2)
}

/**
 * The least the strip has to move for a tile to be wholly visible — nothing at all if it
 * already is. Choosing must never shift the strip under the finger that chose, and the
 * strip must never scroll the page: this returns a new scrollLeft for the track and
 * touches nothing else, where scrollIntoView would walk every ancestor including the
 * document and drag the chosen tile under the sticky header.
 */
export function nudgeOffset(scrollLeft: number, viewportWidth: number, tileLeft: number, tileWidth: number): number {
  if (tileLeft < scrollLeft) return Math.max(0, tileLeft)
  if (tileLeft + tileWidth > scrollLeft + viewportWidth) return Math.max(0, tileLeft + tileWidth - viewportWidth)
  return scrollLeft
}
