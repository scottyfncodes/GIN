import type { RivalryStats } from './stats';
import type { Player } from './types';
import { PLAYER_NAME, PLAYERS } from './types';

export type MomentKind = 'first-lead' | 'lead-change' | 'comeback' | 'level' | 'big-hand' | 'big-lead' | 'streak' | 'closest' | 'milestone';

export interface Moment {
  hand: number;
  timestamp: number;
  kind: MomentKind;
  icon: string;
  title: string;
  detail?: string;
  player?: Player;
}

export const STREAK_MOMENT_MIN = 5;
const MILESTONES = [50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];

/** Notable moments, all derived from the actual hand history (oldest first). */
export function computeMoments(stats: RivalryStats): Moment[] {
  const { rows } = stats;
  const out: Moment[] = [];
  const at = (hand: number) => rows[hand - 1]?.hand.timestamp ?? 0;
  const comebackByHand = new Map(stats.comebacks.map((c) => [c.reclaimHand, c]));

  let everLed = false;
  let prevLeader = 'tie';
  let bestHand = 0;
  let bestComeback = 0;
  for (const r of rows) {
    const n = r.hand.number;
    if (r.leader !== 'tie') {
      const name = PLAYER_NAME[r.leader];
      if (!everLed) {
        out.push({ hand: n, timestamp: r.hand.timestamp, kind: 'first-lead', icon: '🏁', title: `${name} takes the first lead`, detail: `Up by ${r.leadSize}`, player: r.leader });
        everLed = true;
      } else if (r.leadChanged) {
        const c = comebackByHand.get(n);
        const record = c && c.deficit > bestComeback && bestComeback > 0;
        if (c && c.deficit > bestComeback) bestComeback = c.deficit;
        out.push({
          hand: n,
          timestamp: r.hand.timestamp,
          kind: record ? 'comeback' : 'lead-change',
          icon: record ? '🪃' : '⚡',
          title: `${name} takes the lead`,
          detail: c ? `Back from ${c.deficit} down${record ? ' — biggest comeback yet' : ''}` : undefined,
          player: r.leader,
        });
      }
    } else if (prevLeader !== 'tie') {
      out.push({ hand: n, timestamp: r.hand.timestamp, kind: 'level', icon: '🤝', title: 'All square', detail: `${r.scottTotal}–${r.ellenTotal}` });
    }
    prevLeader = r.leader;

    const pts = Math.abs(r.swing);
    if (pts > bestHand) {
      if (bestHand > 0) {
        const p: Player = r.swing > 0 ? 'scott' : 'ellen';
        out.push({ hand: n, timestamp: r.hand.timestamp, kind: 'big-hand', icon: '💥', title: `${PLAYER_NAME[p]} scores ${pts}`, detail: 'Biggest hand yet', player: p });
      }
      bestHand = pts;
    }
    if (MILESTONES.includes(n)) {
      out.push({ hand: n, timestamp: r.hand.timestamp, kind: 'milestone', icon: '🎴', title: `Hand ${n}`, detail: `${r.scottTotal}–${r.ellenTotal}` });
    }
  }

  // Biggest-lead records, logged at the peak of each lead stretch that set one.
  let bestLead = 0;
  for (const s of stats.stretches) {
    if (s.leader === 'tie' || s.peak <= bestLead) continue;
    if (bestLead > 0) {
      out.push({ hand: s.peakHand, timestamp: at(s.peakHand), kind: 'big-lead', icon: '📈', title: `${PLAYER_NAME[s.leader]} leads by ${s.peak}`, detail: 'Biggest lead yet', player: s.leader });
    }
    bestLead = s.peak;
  }

  for (const p of PLAYERS) {
    const ps = stats.players[p];
    const st = ps.longestScoringStreak;
    if (st && st.length >= STREAK_MOMENT_MIN) {
      out.push({ hand: st.endHand, timestamp: at(st.endHand), kind: 'streak', icon: '🔥', title: `${PLAYER_NAME[p]} scores in ${st.length} straight hands`, detail: `${st.points} points, hands ${st.startHand}–${st.endHand}${st.ongoing ? ' · still going' : ''}`, player: p });
    }
  }

  const cr = stats.closestRace;
  if (cr && stats.handCount >= 10) {
    out.push({ hand: cr.hand, timestamp: at(cr.hand), kind: 'closest', icon: '🎯', title: `Closest race: ${cr.value} point${cr.value === 1 ? '' : 's'} apart`, detail: cr.occurrences > 1 ? `Most recent of ${cr.occurrences} times` : undefined });
  }

  return out.sort((a, b) => a.hand - b.hand);
}
