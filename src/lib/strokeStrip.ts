// Where a stroke strip should sit. Kept out of the component because it is arithmetic, and
// because the component can only be asked about it through a layout jsdom does not have.

/**
 * Puts a tile in the middle of the strip; par gets this, so every player's strip lines up.
 * tileLeft is an offsetLeft, so the strip has to be the tile's own offset parent.
 */
export function centreOffset(tileLeft: number, tileWidth: number, viewportWidth: number): number {
  return Math.max(0, tileLeft + tileWidth / 2 - viewportWidth / 2)
}

// eslint-disable-next-line comment-cap/max-lines -- names why centred rather than flush, which is the change someone would otherwise undo
/**
 * Where the strip must sit for a tile to be wholly visible: exactly where it is when the tile
 * already is, centred when it is not. Centred rather than flush to the edge, because the strip
 * snaps to whole tiles and a flush rest is not one — it would be dragged back off the tile it
 * was asked to show. A scrollLeft for the track alone, where scrollIntoView walks every
 * ancestor and drags the page under the sticky header.
 */
export function revealOffset(scrollLeft: number, viewportWidth: number, tileLeft: number, tileWidth: number): number {
  const inView = tileLeft >= scrollLeft && tileLeft + tileWidth <= scrollLeft + viewportWidth
  return inView ? scrollLeft : centreOffset(tileLeft, tileWidth, viewportWidth)
}
