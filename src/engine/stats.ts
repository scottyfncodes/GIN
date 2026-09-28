import type { Hand, Leader, Player } from './types';
import { other, PLAYERS } from './types';

/** Derived state after a given hand. `diff` is Scott's total minus Ellen's. */
export interface HandRow {
  hand: Hand;
  scottTotal: number;
  ellenTotal: number;
  diff: number;
  leader: Leader;
  leadSize: number;
  /** Change in `diff` caused by this hand (positive = toward Scott). */
  swing: number;
  /** A player took the lead from the other (ties in between don't count as changes). */
  leadChanged: boolean;
}

export interface LeadStretch {
  leader: Leader;
  startHand: number;
  endHand: number;
  hands: number;
  startTime: number;
  /** Timestamp of the hand that ended the stretch, or null if it is still going. */
  endTime: number | null;
  ongoing: boolean;
  peak: number;
  peakHand: number;
}

export interface Comeback {
  player: Player;
  deficit: number;
  deficitHand: number;
  /** First hand of the deficit period. */
  behindFromHand: number;
  reclaimHand: number;
}

export interface Streak {
  player: Player;
  length: number;
  startHand: number;
  endHand: number;
  points: number;
  ongoing: boolean;
}

export interface Run {
  player: Player;
  points: number;
  startHand: number;
  endHand: number;
  ongoing: boolean;
}

export interface Mark {
  value: number;
  hand: number;
}

export interface PlayerMark extends Mark {
  player: Player;
}

export interface PlayerStats {
  player: Player;
  totalPoints: number;
  avgLeftover: number;
  medianLeftover: number;
  bestLeftover: Mark | null;
  worstLeftover: Mark | null;
  avgPointsPerHand: number;
  avgScoringHand: number;
  biggestHand: Mark | null;
  scoringHands: number;
  zeroHands: number;
  currentScoringStreak: number;
  longestScoringStreak: Streak | null;
  currentShutoutStreak: number;
  longestShutoutStreak: Streak | null;
  handsLed: number;
  pctLed: number;
  longestLead: LeadStretch | null;
  longestLeadByTime: LeadStretch | null;
  biggestLead: Mark | null;
  biggestComeback: Comeback | null;
  biggestRun: Run | null;
  leftoverBuckets: number[];
  scoringBuckets: number[];
}

export interface RivalryStats {
  rows: HandRow[];
  handCount: number;
  scottTotal: number;
  ellenTotal: number;
  diff: number;
  leader: Leader;
  lead: number;
  leadChanges: number;
  tiedHands: number;
  handsTiedOverall: number;
  stretches: LeadStretch[];
  comebacks: Comeback[];
  players: Record<Player, PlayerStats>;
  biggestHand: PlayerMark | null;
  biggestLead: PlayerMark | null;
  biggestSwing: PlayerMark | null;
  biggestComeback: Comeback | null;
  longestLead: LeadStretch | null;
  closestRace: (Mark & { occurrences: number }) | null;
  closestHand: (PlayerMark & { occurrences: number }) | null;
  avgPointsPerHand: number;
  avgLeftover: number;
  medianLeftover: number;
  avgSwing: number;
}

export const LEFTOVER_BUCKETS = [
  { label: '0–5', min: 0, max: 5 },
  { label: '6–10', min: 6, max: 10 },
  { label: '11–15', min: 11, max: 15 },
  { label: '16–20', min: 16, max: 20 },
  { label: '21–30', min: 21, max: 30 },
  { label: '31+', min: 31, max: Infinity },
];

export const SCORING_BUCKETS = [
  { label: '1–5', min: 1, max: 5 },
  { label: '6–10', min: 6, max: 10 },
  { label: '11–15', min: 11, max: 15 },
  { label: '16–20', min: 16, max: 20 },
  { label: '21+', min: 21, max: Infinity },
];

function bucketIndex(buckets: typeof LEFTOVER_BUCKETS, value: number): number {
  for (let i = 0; i < buckets.length; i++) if (value <= buckets[i].max) return i;
  return buckets.length - 1;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = Float64Array.from(values).sort();
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const leftoverOf = (h: Hand, p: Player) => (p === 'scott' ? h.scottLeftover : h.ellenLeftover);
const pointsOf = (h: Hand, p: Player) => (p === 'scott' ? h.scottPoints : h.ellenPoints);

export function buildRows(hands: readonly Hand[]): HandRow[] {
  const rows: HandRow[] = new Array(hands.length);
  let s = 0;
  let e = 0;
  let lastLeader: Player | null = null;
  for (let i = 0; i < hands.length; i++) {
    const h = hands[i];
    s += h.scottPoints;
    e += h.ellenPoints;
    const diff = s - e;
    const leader: Leader = diff > 0 ? 'scott' : diff < 0 ? 'ellen' : 'tie';
    let leadChanged = false;
    if (leader !== 'tie') {
      leadChanged = lastLeader !== null && lastLeader !== leader;
      lastLeader = leader;
    }
    rows[i] = {
      hand: h,
      scottTotal: s,
      ellenTotal: e,
      diff,
      leader,
      leadSize: Math.abs(diff),
      swing: h.scottPoints - h.ellenPoints,
      leadChanged,
    };
  }
  return rows;
}

export function buildStretches(rows: readonly HandRow[]): LeadStretch[] {
  const out: LeadStretch[] = [];
  let cur: LeadStretch | null = null;
  for (const r of rows) {
    if (cur && cur.leader === r.leader) {
      cur.endHand = r.hand.number;
      cur.hands++;
      if (r.leadSize > cur.peak) {
        cur.peak = r.leadSize;
        cur.peakHand = r.hand.number;
      }
      continue;
    }
    if (cur) {
      cur.endTime = r.hand.timestamp;
      cur.ongoing = false;
    }
    cur = {
      leader: r.leader,
      startHand: r.hand.number,
      endHand: r.hand.number,
      hands: 1,
      startTime: r.hand.timestamp,
      endTime: null,
      ongoing: true,
      peak: r.leadSize,
      peakHand: r.hand.number,
    };
    out.push(cur);
  }
  return out;
}

/** Elapsed time of a stretch; ongoing stretches run until `now`. */
export function stretchDuration(s: LeadStretch, now = Date.now()): number {
  return Math.max(0, (s.endTime ?? now) - s.startTime);
}

/**
 * A comeback: a player falls behind and later takes the lead outright.
 * Ties during the deficit don't end it; only retaking the lead does.
 */
export function findComebacks(rows: readonly HandRow[]): Comeback[] {
  const out: Comeback[] = [];
  for (const p of PLAYERS) {
    let tracking = false;
    let deficit = 0;
    let deficitHand = 0;
    let behindFrom = 0;
    for (const r of rows) {
      if (r.leader === other(p)) {
        if (!tracking) {
          tracking = true;
          deficit = 0;
          behindFrom = r.hand.number;
        }
        if (r.leadSize > deficit) {
          deficit = r.leadSize;
          deficitHand = r.hand.number;
        }
      } else if (r.leader === p && tracking) {
        out.push({ player: p, deficit, deficitHand, behindFromHand: behindFrom, reclaimHand: r.hand.number });
        tracking = false;
      }
    }
  }
  return out.sort((a, b) => a.reclaimHand - b.reclaimHand);
}

function streaks(hands: readonly Hand[], p: Player, scoring: boolean) {
  let longest: Streak | null = null;
  let len = 0;
  let start = 0;
  let pts = 0;
  for (const h of hands) {
    const got = pointsOf(h, p);
    if (got > 0 === scoring) {
      if (len === 0) {
        start = h.number;
        pts = 0;
      }
      len++;
      pts += got;
      if (!longest || len > longest.length) {
        longest = { player: p, length: len, startHand: start, endHand: h.number, points: pts, ongoing: false };
      }
    } else {
      len = 0;
    }
  }
  if (longest && len > 0 && longest.startHand === start) longest.ongoing = true;
  return { current: len, longest };
}

/** Largest stretch of unanswered points: scoring that the opponent didn't answer (ties don't interrupt). */
function biggestRun(hands: readonly Hand[], p: Player): Run | null {
  let best: Run | null = null;
  let cur: Run | null = null;
  for (const h of hands) {
    const mine = pointsOf(h, p);
    const theirs = pointsOf(h, other(p));
    if (theirs > 0) {
      cur = null;
    } else if (mine > 0) {
      if (!cur) cur = { player: p, points: 0, startHand: h.number, endHand: h.number, ongoing: false };
      cur.points += mine;
      cur.endHand = h.number;
      if (!best || cur.points > best.points) best = { ...cur };
    }
  }
  if (best && cur && best.startHand === cur.startHand && best.points === cur.points) best.ongoing = true;
  return best;
}

function playerStats(
  p: Player,
  hands: readonly Hand[],
  rows: readonly HandRow[],
  stretches: readonly LeadStretch[],
  comebacks: readonly Comeback[],
  now: number,
): PlayerStats {
  const n = hands.length;
  const leftovers = new Array<number>(n);
  const leftoverBuckets = LEFTOVER_BUCKETS.map(() => 0);
  const scoringBuckets = SCORING_BUCKETS.map(() => 0);
  let leftoverSum = 0;
  let total = 0;
  let scoringHands = 0;
  let best: Mark | null = null;
  let worst: Mark | null = null;
  let biggest: Mark | null = null;
  for (let i = 0; i < n; i++) {
    const h = hands[i];
    const lo = leftoverOf(h, p);
    const pts = pointsOf(h, p);
    leftovers[i] = lo;
    leftoverSum += lo;
    leftoverBuckets[bucketIndex(LEFTOVER_BUCKETS, lo)]++;
    if (!best || lo < best.value) best = { value: lo, hand: h.number };
    if (!worst || lo > worst.value) worst = { value: lo, hand: h.number };
    if (pts > 0) {
      total += pts;
      scoringHands++;
      scoringBuckets[bucketIndex(SCORING_BUCKETS, pts)]++;
      if (!biggest || pts > biggest.value) biggest = { value: pts, hand: h.number };
    }
  }

  let handsLed = 0;
  let biggestLead: Mark | null = null;
  for (const r of rows) {
    if (r.leader !== p) continue;
    handsLed++;
    if (!biggestLead || r.leadSize > biggestLead.value) biggestLead = { value: r.leadSize, hand: r.hand.number };
  }

  let longestLead: LeadStretch | null = null;
  let longestLeadByTime: LeadStretch | null = null;
  for (const s of stretches) {
    if (s.leader !== p) continue;
    if (!longestLead || s.hands > longestLead.hands) longestLead = s;
    if (!longestLeadByTime || stretchDuration(s, now) > stretchDuration(longestLeadByTime, now)) longestLeadByTime = s;
  }

  let biggestComeback: Comeback | null = null;
  for (const c of comebacks) {
    if (c.player === p && (!biggestComeback || c.deficit > biggestComeback.deficit)) biggestComeback = c;
  }

  const scoring = streaks(hands, p, true);
  const shutout = streaks(hands, p, false);

  return {
    player: p,
    totalPoints: total,
    avgLeftover: n ? leftoverSum / n : 0,
    medianLeftover: median(leftovers),
    bestLeftover: best,
    worstLeftover: worst,
    avgPointsPerHand: n ? total / n : 0,
    avgScoringHand: scoringHands ? total / scoringHands : 0,
    biggestHand: biggest,
    scoringHands,
    zeroHands: n - scoringHands,
    currentScoringStreak: scoring.current,
    longestScoringStreak: scoring.longest,
    currentShutoutStreak: shutout.current,
    longestShutoutStreak: shutout.longest,
    handsLed,
    pctLed: n ? handsLed / n : 0,
    longestLead,
    longestLeadByTime,
    biggestLead,
    biggestComeback,
    biggestRun: biggestRun(hands, p),
    leftoverBuckets,
    scoringBuckets,
  };
}

function pickPlayerMark(a: Mark | null, b: Mark | null): PlayerMark | null {
  if (!a && !b) return null;
  if (a && (!b || a.value > b.value || (a.value === b.value && a.hand <= b.hand))) return { ...a, player: 'scott' };
  return { ...(b as Mark), player: 'ellen' };
}

export function computeStats(hands: readonly Hand[], now = Date.now()): RivalryStats {
  const rows = buildRows(hands);
  const stretches = buildStretches(rows);
  const comebacks = findComebacks(rows);
  const scott = playerStats('scott', hands, rows, stretches, comebacks, now);
  const ellen = playerStats('ellen', hands, rows, stretches, comebacks, now);
  const n = hands.length;
  const last = rows[n - 1];

  let leadChanges = 0;
  let tiedHands = 0;
  let handsTiedOverall = 0;
  let swingSum = 0;
  let closestRace: RivalryStats['closestRace'] = null;
  let closestHand: RivalryStats['closestHand'] = null;
  for (const r of rows) {
    if (r.leadChanged) leadChanges++;
    if (r.leader === 'tie') handsTiedOverall++;
    const pts = Math.abs(r.swing);
    swingSum += pts;
    if (pts === 0) tiedHands++;
    else if (!closestHand || pts < closestHand.value) {
      closestHand = { value: pts, hand: r.hand.number, player: r.swing > 0 ? 'scott' : 'ellen', occurrences: 1 };
    } else if (pts === closestHand.value) {
      closestHand = { value: pts, hand: r.hand.number, player: r.swing > 0 ? 'scott' : 'ellen', occurrences: closestHand.occurrences + 1 };
    }
    if (r.leadSize > 0) {
      if (!closestRace || r.leadSize < closestRace.value) closestRace = { value: r.leadSize, hand: r.hand.number, occurrences: 1 };
      else if (r.leadSize === closestRace.value)
        closestRace = { value: r.leadSize, hand: r.hand.number, occurrences: closestRace.occurrences + 1 };
    }
  }

  let longestLead: LeadStretch | null = null;
  for (const s of [scott.longestLead, ellen.longestLead]) {
    if (s && (!longestLead || s.hands > longestLead.hands || (s.hands === longestLead.hands && s.startHand < longestLead.startHand)))
      longestLead = s;
  }

  let biggestComeback: Comeback | null = null;
  for (const c of comebacks) if (!biggestComeback || c.deficit > biggestComeback.deficit) biggestComeback = c;

  const allLeftovers: number[] = [];
  let leftoverSum = 0;
  for (const h of hands) {
    allLeftovers.push(h.scottLeftover, h.ellenLeftover);
    leftoverSum += h.scottLeftover + h.ellenLeftover;
  }

  const biggestHand = pickPlayerMark(scott.biggestHand, ellen.biggestHand);

  return {
    rows,
    handCount: n,
    scottTotal: last?.scottTotal ?? 0,
    ellenTotal: last?.ellenTotal ?? 0,
    diff: last?.diff ?? 0,
    leader: last?.leader ?? 'tie',
    lead: last?.leadSize ?? 0,
    leadChanges,
    tiedHands,
    handsTiedOverall,
    stretches,
    comebacks,
    players: { scott, ellen },
    biggestHand,
    biggestLead: pickPlayerMark(scott.biggestLead, ellen.biggestLead),
    // Only one player scores per hand, so a hand's swing equals its points.
    biggestSwing: biggestHand,
    biggestComeback,
    longestLead,
    closestRace,
    closestHand,
    avgPointsPerHand: n ? (scott.totalPoints + ellen.totalPoints) / n : 0,
    avgLeftover: n ? leftoverSum / (2 * n) : 0,
    medianLeftover: median(allLeftovers),
    avgSwing: n ? swingSum / n : 0,
  };
}

export interface FormWindow {
  hands: number;
  firstHand: number;
  players: Record<
    Player,
    { points: number; avg: number; scoringHands: number; zeroHands: number; netDiff: number }
  >;
}

/** Stats over the most recent `size` hands. `netDiff` is the change in that player's margin. */
export function recentForm(rows: readonly HandRow[], size: number): FormWindow {
  const slice = rows.slice(-size);
  const startDiff = rows.length > slice.length ? rows[rows.length - slice.length - 1].diff : 0;
  const endDiff = rows.length ? rows[rows.length - 1].diff : 0;
  const make = (p: Player) => {
    let points = 0;
    let scoringHands = 0;
    for (const r of slice) {
      const pts = pointsOf(r.hand, p);
      points += pts;
      if (pts > 0) scoringHands++;
    }
    const net = endDiff - startDiff;
    return {
      points,
      avg: slice.length ? points / slice.length : 0,
      scoringHands,
      zeroHands: slice.length - scoringHands,
      netDiff: p === 'scott' ? net : -net,
    };
  };
  return { hands: slice.length, firstHand: slice[0]?.hand.number ?? 0, players: { scott: make('scott'), ellen: make('ellen') } };
}

/** Rolling sum of swings over the last `size` hands at each hand (positive = toward Scott). */
export function rollingSwing(rows: readonly HandRow[], size: number): number[] {
  const out = new Array<number>(rows.length);
  let sum = 0;
  for (let i = 0; i < rows.length; i++) {
    sum += rows[i].swing;
    if (i >= size) sum -= rows[i - size].swing;
    out[i] = sum;
  }
  return out;
}
