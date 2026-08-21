// Which formats record a score per player. The rest field two a side and record one ball,
// so their player_scores come back empty.
const PER_PLAYER = ['Singles', 'Fourball']

export function recordsScorePerPlayer(formatName: string | null | undefined): boolean {
  return !!formatName && PER_PLAYER.includes(formatName)
}
