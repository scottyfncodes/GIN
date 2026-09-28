export type Player = 'scott' | 'ellen';
export type Leader = Player | 'tie';

export const PLAYERS: readonly Player[] = ['scott', 'ellen'];
export const PLAYER_NAME: Record<Player, string> = { scott: 'Scott', ellen: 'Ellen' };

export function other(p: Player): Player {
  return p === 'scott' ? 'ellen' : 'scott';
}

/**
 * One stored hand. Leftovers, id and timestamp are the raw record; `number`
 * and the awarded points are kept for readability of exports but are always
 * re-derived by `normalizeHands`, so they can never go stale.
 */
export interface Hand {
  id: string;
  number: number;
  timestamp: number;
  scottLeftover: number;
  ellenLeftover: number;
  scottPoints: number;
  ellenPoints: number;
}

export interface HandInput {
  scottLeftover: number;
  ellenLeftover: number;
}
