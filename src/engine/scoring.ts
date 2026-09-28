import type { Player } from './types';

export interface HandScore {
  scott: number;
  ellen: number;
  /** Player who received points, or null when the leftovers were equal. */
  scorer: Player | null;
  points: number;
}

/**
 * House rule: the difference between the two leftovers goes to the player
 * with less leftover; the other receives 0. Equal leftovers score nothing.
 * (Scott 13 / Ellen 0 → Ellen +13; Scott 4 / Ellen 9 → Scott +5.)
 */
export function scoreHand(scottLeftover: number, ellenLeftover: number): HandScore {
  if (scottLeftover < ellenLeftover) {
    const points = ellenLeftover - scottLeftover;
    return { scott: points, ellen: 0, scorer: 'scott', points };
  }
  if (ellenLeftover < scottLeftover) {
    const points = scottLeftover - ellenLeftover;
    return { scott: 0, ellen: points, scorer: 'ellen', points };
  }
  return { scott: 0, ellen: 0, scorer: null, points: 0 };
}

export const MAX_LEFTOVER = 999_999;

export function isValidLeftover(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_LEFTOVER;
}

/** Parses keypad text into a leftover, or null if it is not a whole number ≥ 0. */
export function parseLeftover(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return isValidLeftover(value) ? value : null;
}
