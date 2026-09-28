import { appendHand } from './history';
import type { Hand } from './types';

/** Builds a history from [scottLeftover, ellenLeftover] pairs, one hour apart. */
export function makeHands(pairs: [number, number][], start = Date.UTC(2026, 0, 1)): Hand[] {
  let hands: Hand[] = [];
  pairs.forEach(([s, e], i) => {
    hands = appendHand(hands, { scottLeftover: s, ellenLeftover: e }, start + i * 3_600_000, `id-${i + 1}`);
  });
  return hands;
}

/** Builds a history from signed hand results: +n = Scott scores n, -n = Ellen scores n, 0 = tie. */
export function fromResults(results: number[], start?: number): Hand[] {
  return makeHands(results.map((r) => (r > 0 ? [0, r] : r < 0 ? [-r, 0] : [0, 0]) as [number, number]), start);
}
