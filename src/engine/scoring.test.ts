import { describe, expect, it } from 'vitest';
import { parseLeftover, scoreHand } from './scoring';

describe('scoreHand (house rule)', () => {
  it.each([
    [13, 0, 0, 13],
    [4, 9, 5, 0],
    [7, 7, 0, 0],
    [18, 3, 0, 15],
    [0, 0, 0, 0],
    [9, 4, 0, 5],
    [0, 1, 1, 0],
    [0, 100000, 100000, 0],
  ])('Scott %i / Ellen %i → Scott +%i, Ellen +%i', (s, e, sp, ep) => {
    const r = scoreHand(s, e);
    expect(r.scott).toBe(sp);
    expect(r.ellen).toBe(ep);
  });

  it('awards the difference to the player with less leftover', () => {
    expect(scoreHand(0, 13)).toEqual({ scott: 13, ellen: 0, scorer: 'scott', points: 13 });
    expect(scoreHand(13, 0)).toEqual({ scott: 0, ellen: 13, scorer: 'ellen', points: 13 });
  });

  it('awards nothing on equal leftovers', () => {
    expect(scoreHand(7, 7)).toEqual({ scott: 0, ellen: 0, scorer: null, points: 0 });
  });
});

describe('parseLeftover', () => {
  it('accepts non-negative whole numbers', () => {
    expect(parseLeftover('0')).toBe(0);
    expect(parseLeftover('13')).toBe(13);
    expect(parseLeftover(' 42 ')).toBe(42);
    expect(parseLeftover('007')).toBe(7);
  });
  it.each(['', '-1', '1.5', '1e3', 'abc', '12a', '+3', '9999999'])('rejects %j', (t) => {
    expect(parseLeftover(t)).toBeNull();
  });
});
