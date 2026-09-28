import type { ReactNode } from 'react';
import type { PlayerStats, RivalryStats } from '../../engine/stats';
import { LEFTOVER_BUCKETS, SCORING_BUCKETS, stretchDuration } from '../../engine/stats';
import { Empty, Section } from '../bits';
import { PairedBars } from '../charts/Bars';
import { dec, duration, handRange, handsLabel, num, pct } from '../format';

type Row = [label: string, render: (p: PlayerStats) => ReactNode];

const at = (hand: number) => <small className="muted"> · #{num(hand)}</small>;

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Leftovers',
    rows: [
      ['Average leftover', (p) => dec(p.avgLeftover)],
      ['Median leftover', (p) => dec(p.medianLeftover)],
      ['Best (lowest)', (p) => (p.bestLeftover ? <>{num(p.bestLeftover.value)}{at(p.bestLeftover.hand)}</> : '—')],
      ['Worst (highest)', (p) => (p.worstLeftover ? <>{num(p.worstLeftover.value)}{at(p.worstLeftover.hand)}</> : '—')],
    ],
  },
  {
    title: 'Scoring',
    rows: [
      ['Total points', (p) => num(p.totalPoints)],
      ['Points per hand', (p) => dec(p.avgPointsPerHand)],
      ['Average scoring hand', (p) => dec(p.avgScoringHand)],
      ['Largest single hand', (p) => (p.biggestHand ? <>{num(p.biggestHand.value)}{at(p.biggestHand.hand)}</> : '—')],
      ['Scoring hands', (p) => num(p.scoringHands)],
      ['Zero-point hands', (p) => num(p.zeroHands)],
      ['Biggest unanswered run', (p) => (p.biggestRun ? <>{num(p.biggestRun.points)}<small className="muted"> · {handRange(p.biggestRun.startHand, p.biggestRun.endHand)}</small></> : '—')],
    ],
  },
  {
    title: 'Streaks',
    rows: [
      ['Current scoring streak', (p) => num(p.currentScoringStreak)],
      ['Longest scoring streak', (p) => (p.longestScoringStreak ? <>{num(p.longestScoringStreak.length)}{at(p.longestScoringStreak.endHand)}</> : '0')],
      ['Current shutout streak', (p) => num(p.currentShutoutStreak)],
      ['Longest shutout streak', (p) => (p.longestShutoutStreak ? <>{num(p.longestShutoutStreak.length)}{at(p.longestShutoutStreak.endHand)}</> : '0')],
    ],
  },
  {
    title: 'Leading',
    rows: [
      ['Hands led', (p) => num(p.handsLed)],
      ['Share of hands led', (p) => pct(p.pctLed)],
      ['Longest lead', (p) => (p.longestLead ? <>{handsLabel(p.longestLead.hands)}<br /><small className="muted">{duration(stretchDuration(p.longestLead))}</small></> : '—')],
      ['Biggest lead', (p) => (p.biggestLead ? <>{num(p.biggestLead.value)}{at(p.biggestLead.hand)}</> : '—')],
      ['Biggest comeback', (p) => (p.biggestComeback ? <>{num(p.biggestComeback.deficit)}{at(p.biggestComeback.reclaimHand)}</> : '—')],
    ],
  },
];

function Summary({ label, s, e }: { label: string; s: ReactNode; e: ReactNode }) {
  return (
    <div className="dist-summary">
      <span className="muted">{label}</span>
      <span className="c-scott">{s}</span>
      <span className="c-ellen">{e}</span>
    </div>
  );
}

export function Players({ stats }: { stats: RivalryStats }) {
  const { scott, ellen } = stats.players;
  if (stats.handCount === 0) {
    return (
      <div className="screen">
        <h1 className="screen-title">Players</h1>
        <Empty>Profiles fill in as hands are recorded.</Empty>
      </div>
    );
  }
  return (
    <div className="screen">
      <h1 className="screen-title">Players</h1>
      <div className="profile-heads">
        <div className="profile-head who-scott">
          <span className="profile-name">SCOTT</span>
          <span className="profile-total">{num(scott.totalPoints)}</span>
        </div>
        <div className="profile-head who-ellen">
          <span className="profile-name">ELLEN</span>
          <span className="profile-total">{num(ellen.totalPoints)}</span>
        </div>
      </div>

      {GROUPS.map((g) => (
        <Section title={g.title} key={g.title}>
          <table className="h2h">
            <tbody>
              {g.rows.map(([label, render]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td className="c-scott-soft">{render(scott)}</td>
                  <td className="c-ellen-soft">{render(ellen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}

      <Section title="Leftover distribution">
        <p className="footnote">Share of each player’s hands by leftover total.</p>
        <PairedBars unit="leftovers" labels={LEFTOVER_BUCKETS.map((b) => b.label)} scott={scott.leftoverBuckets} ellen={ellen.leftoverBuckets} />
        <Summary label="Average" s={dec(scott.avgLeftover)} e={dec(ellen.avgLeftover)} />
        <Summary label="Median" s={dec(scott.medianLeftover)} e={dec(ellen.medianLeftover)} />
        <Summary label="Lowest" s={num(scott.bestLeftover?.value ?? 0)} e={num(ellen.bestLeftover?.value ?? 0)} />
        <Summary label="Highest" s={num(scott.worstLeftover?.value ?? 0)} e={num(ellen.worstLeftover?.value ?? 0)} />
      </Section>

      <Section title="Scoring distribution">
        <p className="footnote">Size of the points on hands where each player scored.</p>
        {scott.scoringHands + ellen.scoringHands === 0 ? (
          <Empty>No points scored yet.</Empty>
        ) : (
          <PairedBars unit="points scored" labels={SCORING_BUCKETS.map((b) => b.label)} scott={scott.scoringBuckets} ellen={ellen.scoringBuckets} />
        )}
        <Summary label="Scoring hands" s={num(scott.scoringHands)} e={num(ellen.scoringHands)} />
        <Summary label="Average scoring hand" s={dec(scott.avgScoringHand)} e={dec(ellen.avgScoringHand)} />
        <Summary label="Largest" s={num(scott.biggestHand?.value ?? 0)} e={num(ellen.biggestHand?.value ?? 0)} />
      </Section>
    </div>
  );
}
