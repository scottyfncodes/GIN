import { describe, expect, it } from 'vitest';
import { appendHand, deleteHand, editHand, removeLastHand } from './history';
import { computeMoments } from './moments';
import { buildRows, computeStats, median, recentForm, rollingSwing, stretchDuration } from './stats';
import { fromResults, makeHands } from './testUtils';

describe('cumulative scoring', () => {
  it('accumulates totals, diff, leader and lead', () => {
    const s = computeStats(makeHands([[13, 0], [4, 9], [7, 7], [18, 3]]));
    // Ellen +13, Scott +5, tie, Ellen +15
    expect(s.scottTotal).toBe(5);
    expect(s.ellenTotal).toBe(28);
    expect(s.leader).toBe('ellen');
    expect(s.lead).toBe(23);
    expect(s.rows.map((r) => r.diff)).toEqual([-13, -8, -8, -23]);
  });

  it('handles empty history', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({ handCount: 0, scottTotal: 0, ellenTotal: 0, leader: 'tie', lead: 0, leadChanges: 0 });
    expect(s.biggestHand).toBeNull();
    expect(s.closestRace).toBeNull();
    expect(s.players.scott.avgLeftover).toBe(0);
    expect(computeMoments(s)).toEqual([]);
  });

  it('handles a single 0/0 hand', () => {
    const s = computeStats(makeHands([[0, 0]]));
    expect(s).toMatchObject({ handCount: 1, leader: 'tie', lead: 0, tiedHands: 1, handsTiedOverall: 1 });
    expect(s.biggestHand).toBeNull();
    expect(s.closestHand).toBeNull();
    expect(s.players.scott.zeroHands).toBe(1);
  });

  it('handles very large values', () => {
    const s = computeStats(makeHands([[0, 999999], [999999, 0]]));
    expect(s.scottTotal).toBe(999999);
    expect(s.ellenTotal).toBe(999999);
    expect(s.leader).toBe('tie');
  });
});

describe('lead detection and changes', () => {
  it('counts lead changes, ignoring ties in between', () => {
    // S+5, E+10 (E leads), S+5 (tie), S+1 (S leads), tie hand, E+1 (tie), E+1 (E leads)
    const s = computeStats(fromResults([5, -10, 5, 1, 0, -1, -1]));
    expect(s.rows.map((r) => r.leader)).toEqual(['scott', 'ellen', 'tie', 'scott', 'scott', 'tie', 'ellen']);
    expect(s.rows.map((r) => r.leadChanged)).toEqual([false, true, false, true, false, false, true]);
    expect(s.leadChanges).toBe(3);
  });

  it('does not count regaining the same lead after a tie as a change', () => {
    const s = computeStats(fromResults([5, -5, 3]));
    expect(s.leadChanges).toBe(0);
  });

  it('detects a lead change by exactly one point', () => {
    const s = computeStats(fromResults([4, -5]));
    expect(s.leader).toBe('ellen');
    expect(s.lead).toBe(1);
    expect(s.leadChanges).toBe(1);
  });

  it('handles repeated lead changes', () => {
    const s = computeStats(fromResults([1, -2, 2, -2, 2, -2]));
    expect(s.leadChanges).toBe(5);
  });

  it('computes percentage of hands led', () => {
    const s = computeStats(fromResults([5, 5, -20, 0]));
    expect(s.players.scott.handsLed).toBe(2);
    expect(s.players.ellen.handsLed).toBe(2);
    expect(s.players.scott.pctLed).toBe(0.5);
  });
});

describe('longest lead and stretches', () => {
  it('finds longest lead in hands with duration', () => {
    const hands = fromResults([3, 3, 3, -20, 1, 1, 1, 1, 30, 0]);
    const s = computeStats(hands);
    expect(s.stretches.map((x) => [x.leader, x.startHand, x.endHand])).toEqual([
      ['scott', 1, 3],
      ['ellen', 4, 8],
      ['scott', 9, 10],
    ]);
    const e = s.players.ellen.longestLead!;
    expect(e.hands).toBe(5);
    expect(e.ongoing).toBe(false);
    // Hands 4..8 — ended when hand 9 was played, 5 hours after hand 4.
    expect(stretchDuration(e)).toBe(5 * 3_600_000);
    expect(s.longestLead).toBe(e);
    expect(s.stretches[2].ongoing).toBe(true);
  });

  it('includes tie stretches in the timeline', () => {
    const s = computeStats(fromResults([0, 0, 4, -4]));
    expect(s.stretches.map((x) => [x.leader, x.hands])).toEqual([
      ['tie', 2],
      ['scott', 1],
      ['tie', 1],
    ]);
  });
});

describe('biggest lead', () => {
  it('tracks the largest advantage ever held and when', () => {
    const s = computeStats(fromResults([10, 15, -40, -5, 30]));
    expect(s.players.scott.biggestLead).toEqual({ value: 25, hand: 2 });
    expect(s.players.ellen.biggestLead).toEqual({ value: 20, hand: 4 });
    expect(s.biggestLead).toEqual({ value: 25, hand: 2, player: 'scott' });
  });
});

describe('comebacks', () => {
  it('detects a comeback from the maximum deficit', () => {
    // Ellen falls behind by 10, then 25, ties, then leads.
    const s = computeStats(fromResults([10, 15, -25, -1]));
    expect(s.comebacks).toEqual([{ player: 'ellen', deficit: 25, deficitHand: 2, behindFromHand: 1, reclaimHand: 4 }]);
    expect(s.biggestComeback?.deficit).toBe(25);
    expect(s.players.ellen.biggestComeback?.deficit).toBe(25);
    expect(s.players.scott.biggestComeback).toBeNull();
  });

  it('does not fabricate a comeback when the lead is never retaken', () => {
    const s = computeStats(fromResults([30, -29, -1]));
    expect(s.comebacks).toEqual([]);
    expect(s.biggestComeback).toBeNull();
  });

  it('finds the biggest of several comebacks', () => {
    const s = computeStats(fromResults([5, -6, 47, -60, 20]));
    // Ellen from 5, Scott from 1, Ellen from 46, Scott from 14
    expect(s.comebacks.map((c) => [c.player, c.deficit, c.reclaimHand])).toEqual([
      ['ellen', 5, 2],
      ['scott', 1, 3],
      ['ellen', 46, 4],
      ['scott', 14, 5],
    ]);
    expect(s.biggestComeback).toMatchObject({ player: 'ellen', deficit: 46, deficitHand: 3, reclaimHand: 4 });
  });
});

describe('streaks', () => {
  it('tracks scoring streaks (ties break them)', () => {
    const s = computeStats(fromResults([1, 2, 3, 0, 4, 5, -1, 6]));
    const p = s.players.scott;
    expect(p.longestScoringStreak).toMatchObject({ length: 3, startHand: 1, endHand: 3, points: 6, ongoing: false });
    expect(p.currentScoringStreak).toBe(1);
  });

  it('tracks shutout streaks, including ongoing ones', () => {
    const s = computeStats(fromResults([5, -1, -2, 0, 3, -1, 0, -2, -4]));
    const e = s.players.scott;
    expect(e.longestShutoutStreak).toMatchObject({ length: 4, startHand: 6, endHand: 9, ongoing: true });
    expect(e.currentShutoutStreak).toBe(4);
    expect(s.players.ellen.longestShutoutStreak).toMatchObject({ length: 2, startHand: 4, endHand: 5 });
  });

  it('finds the biggest unanswered run', () => {
    const s = computeStats(fromResults([10, 0, 12, -1, 30]));
    expect(s.players.scott.biggestRun).toMatchObject({ points: 30, startHand: 5, endHand: 5, ongoing: true });
    const t = computeStats(fromResults([10, 0, 12, -1, 5]));
    expect(t.players.scott.biggestRun).toMatchObject({ points: 22, startHand: 1, endHand: 3, ongoing: false });
  });
});

describe('records and averages', () => {
  it('computes closest race, closest hand, swing and averages', () => {
    const hands = makeHands([[0, 10], [9, 0], [3, 3], [2, 4]]);
    // Scott+10, Ellen+9, tie, Scott+2 → diffs 10, 1, 1, 3
    const s = computeStats(hands);
    expect(s.closestRace).toEqual({ value: 1, hand: 3, occurrences: 2 });
    expect(s.closestHand).toEqual({ value: 2, hand: 4, player: 'scott', occurrences: 1 });
    expect(s.biggestHand).toEqual({ value: 10, hand: 1, player: 'scott' });
    expect(s.biggestSwing).toEqual(s.biggestHand);
    expect(s.avgPointsPerHand).toBe(21 / 4);
    expect(s.avgSwing).toBe(21 / 4);
    expect(s.avgLeftover).toBe(31 / 8);
    expect(s.medianLeftover).toBe(3);
    expect(s.players.scott.medianLeftover).toBe(2.5);
    expect(s.players.scott.bestLeftover).toEqual({ value: 0, hand: 1 });
    expect(s.players.ellen.worstLeftover).toEqual({ value: 10, hand: 1 });
    expect(s.players.scott.avgScoringHand).toBe(6);
  });

  it('buckets leftovers and scoring hands', () => {
    const s = computeStats(makeHands([[0, 5], [6, 11], [16, 21], [31, 100], [3, 3]]));
    expect(s.players.scott.leftoverBuckets).toEqual([2, 1, 0, 1, 0, 1]);
    expect(s.players.ellen.leftoverBuckets).toEqual([2, 0, 1, 0, 1, 1]);
    expect(s.players.scott.scoringBuckets).toEqual([3, 0, 0, 0, 1]);
  });

  it('median works for odd/even/empty', () => {
    expect(median([])).toBe(0);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([10, 2, 4, 1])).toBe(3);
  });
});

describe('recent form and momentum', () => {
  it('summarises the last N hands', () => {
    const rows = buildRows(fromResults([20, -5, 3, -4, 0]));
    const f = recentForm(rows, 3);
    expect(f.hands).toBe(3);
    expect(f.firstHand).toBe(3);
    expect(f.players.scott).toMatchObject({ points: 3, scoringHands: 1, zeroHands: 2, netDiff: -1 });
    expect(f.players.ellen).toMatchObject({ points: 4, scoringHands: 1, zeroHands: 2, netDiff: 1 });
    expect(recentForm(rows, 25).hands).toBe(5);
  });

  it('computes rolling swing sums', () => {
    const rows = buildRows(fromResults([1, 2, -3, 4]));
    expect(rollingSwing(rows, 2)).toEqual([1, 3, -1, 1]);
  });
});

describe('historical edits and deletion', () => {
  it('recalculates everything after editing an old hand', () => {
    let hands = fromResults([10, -5, 3]);
    expect(computeStats(hands).scottTotal).toBe(13);
    hands = editHand(hands, hands[0].id, { scottLeftover: 30, ellenLeftover: 0 });
    const s = computeStats(hands);
    expect(hands[0].ellenPoints).toBe(30);
    expect(hands[0].scottPoints).toBe(0);
    expect(s.scottTotal).toBe(3);
    expect(s.ellenTotal).toBe(35);
    expect(s.rows.map((r) => r.diff)).toEqual([-30, -35, -32]);
  });

  it('renumbers and recalculates after deleting a middle hand', () => {
    let hands = fromResults([10, -50, 3]);
    hands = deleteHand(hands, hands[1].id);
    expect(hands.map((h) => h.number)).toEqual([1, 2]);
    const s = computeStats(hands);
    expect(s.scottTotal).toBe(13);
    expect(s.leadChanges).toBe(0);
    expect(s.comebacks).toEqual([]);
  });

  it('can delete the only hand and undo the last hand', () => {
    const one = fromResults([4]);
    expect(deleteHand(one, one[0].id)).toEqual([]);
    const two = fromResults([4, -2]);
    expect(removeLastHand(two)).toEqual([two[0]]);
    expect(removeLastHand([])).toEqual([]);
  });

  it('appends with sequential numbers', () => {
    const hands = appendHand(fromResults([1, 2]), { scottLeftover: 0, ellenLeftover: 0 });
    expect(hands.map((h) => h.number)).toEqual([1, 2, 3]);
  });
});

describe('moments', () => {
  it('generates events only from real data', () => {
    const s = computeStats(fromResults([5, -8, 20, -2, -40]));
    const kinds = computeMoments(s).map((m) => `${m.hand}:${m.kind}`);
    expect(kinds).toContain('1:first-lead');
    expect(kinds).toContain('2:lead-change');
    expect(kinds).toContain('3:big-hand');
    expect(kinds).toContain('5:comeback');
    expect(kinds).not.toContain('1:big-hand');
  });

  it('logs ties returning the game level', () => {
    const s = computeStats(fromResults([5, -5]));
    expect(computeMoments(s).map((m) => m.kind)).toEqual(['first-lead', 'level']);
  });
});

describe('performance', () => {
  it('computes stats for 10,000 hands quickly', () => {
    const results = Array.from({ length: 10_000 }, (_, i) => ((i * 7919) % 41) - 20);
    const hands = fromResults(results);
    const t = performance.now();
    const s = computeStats(hands);
    computeMoments(s);
    expect(performance.now() - t).toBeLessThan(500);
    expect(s.handCount).toBe(10_000);
  });
});
