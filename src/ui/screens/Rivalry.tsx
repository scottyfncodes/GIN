import { useMemo, useState } from 'react';
import type { LeadStretch, RivalryStats } from '../../engine/stats';
import { recentForm, rollingSwing, stretchDuration } from '../../engine/stats';
import type { Player } from '../../engine/types';
import { Empty, Section, Segmented, Stat } from '../bits';
import { SwingBars } from '../charts/Bars';
import { LeadStrip } from '../charts/LeadStrip';
import { LineChart, type Series } from '../charts/LineChart';
import { dec, duration, handRange, handsLabel, leaderName, name, num, pct } from '../format';

type Range = 0 | 25 | 50 | 100;
const RANGES: { value: Range; label: string }[] = [
  { value: 0, label: 'All' },
  { value: 100, label: '100' },
  { value: 50, label: '50' },
  { value: 25, label: '25' },
];

function leadSub(s: LeadStretch | null) {
  if (!s) return 'Never led';
  return (
    <>
      {handRange(s.startHand, s.endHand)}
      {s.ongoing ? ' · ongoing' : ''}
      <br />
      {duration(stretchDuration(s))}
    </>
  );
}

/** A differential change, named by who it favoured: "Ellen +12". */
function signed(n: number) {
  if (n === 0) return '±0';
  const who: Player = n > 0 ? 'scott' : 'ellen';
  return `${name(who)} +${num(Math.abs(n))}`;
}

const margin = (n: number) => (n === 0 ? '±0' : `${n > 0 ? '+' : '−'}${num(Math.abs(n))}`);

export function Rivalry({ stats }: { stats: RivalryStats }) {
  const [range, setRange] = useState<Range>(0);
  const [formSize, setFormSize] = useState(10);
  const [showAllStretches, setShowAllStretches] = useState(false);
  const { rows, handCount, players } = stats;

  const windowRows = useMemo(() => (range ? rows.slice(-range) : rows), [rows, range]);
  const firstHand = windowRows[0]?.hand.number ?? 1;
  const scoreSeries = useMemo<Series[]>(
    () => [
      { key: 'scott', className: 'stroke-scott', values: windowRows.map((r) => r.scottTotal) },
      { key: 'ellen', className: 'stroke-ellen', values: windowRows.map((r) => r.ellenTotal) },
    ],
    [windowRows],
  );
  const diffSeries = useMemo<Series[]>(() => [{ key: 'diff', className: '', values: windowRows.map((r) => r.diff) }], [windowRows]);
  const rolling = useMemo(() => rollingSwing(rows, 10), [rows]);
  const form = useMemo(() => recentForm(rows, formSize), [rows, formSize]);

  if (handCount === 0) {
    return (
      <div className="screen">
        <h1 className="screen-title">Rivalry</h1>
        <Empty>The rivalry starts with the first hand. Everything here is calculated from real hands only.</Empty>
      </div>
    );
  }

  const lastRow = rows[rows.length - 1];
  const stretches = stats.stretches;
  const listed = showAllStretches ? [...stretches].reverse() : stretches.slice(-12).reverse();
  const largestSwingAbs = Math.abs(stats.biggestSwing?.value ?? 0);
  const trend = rolling[rolling.length - 1] ?? 0;

  return (
    <div className="screen">
      <h1 className="screen-title">Rivalry</h1>

      <Section title="The lead">
        <div className="lead-hero">
          <div>
            <div className="stat-label">Current leader</div>
            <div className={`lead-hero-name c-${stats.leader}`}>{leaderName(stats.leader)}</div>
          </div>
          <div>
            <div className="stat-label">Current lead</div>
            <div className={`lead-hero-num c-${stats.leader}`}>{num(stats.lead)}</div>
          </div>
        </div>
        <div className="grid2">
          <Stat label="Lead changes" value={num(stats.leadChanges)} />
          <Stat label="Hands level" value={num(stats.handsTiedOverall)} />
          <Stat label="Longest Scott lead" who="scott" value={players.scott.longestLead ? handsLabel(players.scott.longestLead.hands) : '—'} sub={leadSub(players.scott.longestLead)} />
          <Stat label="Longest Ellen lead" who="ellen" value={players.ellen.longestLead ? handsLabel(players.ellen.longestLead.hands) : '—'} sub={leadSub(players.ellen.longestLead)} />
        </div>
        <div className="stat-label spaced">Hands spent leading</div>
        <div className="splitbar" role="img" aria-label={`Scott led ${pct(players.scott.pctLed)} of hands, Ellen ${pct(players.ellen.pctLed)}`}>
          <div className="bg-scott" style={{ flexGrow: players.scott.handsLed }} />
          <div className="bg-tie" style={{ flexGrow: stats.handsTiedOverall }} />
          <div className="bg-ellen" style={{ flexGrow: players.ellen.handsLed }} />
        </div>
        <div className="splitbar-legend">
          <span className="c-scott">Scott {pct(players.scott.pctLed)}</span>
          {stats.handsTiedOverall ? <span className="muted">Level {pct(stats.handsTiedOverall / handCount)}</span> : null}
          <span className="c-ellen">Ellen {pct(players.ellen.pctLed)}</span>
        </div>
        {(['scott', 'ellen'] as const).map((p) => {
          const byTime = players[p].longestLeadByTime;
          if (!byTime || byTime === players[p].longestLead) return null;
          return (
            <p className="footnote" key={p}>
              {name(p)}’s longest lead by time: {duration(stretchDuration(byTime))} ({handRange(byTime.startHand, byTime.endHand)}, {handsLabel(byTime.hands)}).
            </p>
          );
        })}
      </Section>

      <Section title="Score history" aside={<Segmented label="Range" options={RANGES} value={range} onChange={setRange} />}>
        <LineChart
          ariaLabel="Cumulative score by hand"
          series={scoreSeries}
          firstHand={firstHand}
          height={220}
          renderReadout={(i) => {
            const r = windowRows[i];
            return (
              <>
                <span className="muted">Hand {num(r.hand.number)}</span>
                <span className="c-scott">Scott {num(r.scottTotal)}</span>
                <span className="c-ellen">Ellen {num(r.ellenTotal)}</span>
              </>
            );
          }}
        />
        <div className="legend">
          <span className="c-scott">● Scott</span>
          <span className="c-ellen">● Ellen</span>
        </div>
      </Section>

      <Section title="Lead timeline">
        <LeadStrip stretches={stats.stretches} total={handCount} />
        <div className="strip-ends">
          <span>Hand 1</span>
          <span>Hand {num(handCount)}</span>
        </div>
        <ol className="stretches">
          {listed.map((s) => (
            <li key={s.startHand} className={`stretch who-${s.leader}`}>
              <div className="stretch-who">{s.leader === 'tie' ? 'LEVEL' : name(s.leader).toUpperCase()}</div>
              <div className="stretch-range">
                {handRange(s.startHand, s.endHand)}
                {s.ongoing ? <span className="tag">NOW</span> : null}
              </div>
              <div className="stretch-meta">
                {handsLabel(s.hands)} · {duration(stretchDuration(s))}
                {s.leader !== 'tie' ? ` · peak ${num(s.peak)}` : ''}
              </div>
            </li>
          ))}
        </ol>
        {stretches.length > 12 ? (
          <button className="text-btn more" onClick={() => setShowAllStretches((v) => !v)}>
            {showAllStretches ? 'Show fewer' : `Show all ${num(stretches.length)} stretches`}
          </button>
        ) : null}
      </Section>

      <Section title="Momentum">
        <p className="footnote">
          Momentum here is just the score differential (Scott − Ellen) and how much each hand moved it. Only one player scores per hand, so a hand’s swing equals its points.
        </p>
        <div className="grid2">
          <Stat label="Differential" who={stats.leader} value={stats.diff === 0 ? 'Level' : signed(stats.diff)} />
          <Stat label="Last hand" value={signed(lastRow.swing)} sub={`Hand ${num(lastRow.hand.number)}`} />
          <Stat label="Largest swing" who={stats.biggestSwing?.player} value={num(largestSwingAbs)} sub={stats.biggestSwing ? `${name(stats.biggestSwing.player)} · hand ${num(stats.biggestSwing.hand)}` : '—'} />
          <Stat label="Average swing" value={dec(stats.avgSwing)} sub="points per hand" />
          <Stat label="Last 10 hands" who={trend > 0 ? 'scott' : trend < 0 ? 'ellen' : null} value={signed(trend)} sub="net change in differential" />
        </div>
        <div className="stat-label spaced">Differential over time</div>
        <LineChart
          ariaLabel="Score differential by hand"
          series={diffSeries}
          firstHand={firstHand}
          height={170}
          zeroFill={{ aboveClass: 'tone-scott', belowClass: 'tone-ellen' }}
          renderReadout={(i) => {
            const r = windowRows[i];
            return (
              <>
                <span className="muted">Hand {num(r.hand.number)}</span>
                <span className={`c-${r.leader}`}>{r.leader === 'tie' ? 'Level' : `${name(r.leader)} by ${num(r.leadSize)}`}</span>
              </>
            );
          }}
        />
        <div className="legend">
          <span className="c-scott">▲ Scott ahead</span>
          <span className="c-ellen">▼ Ellen ahead</span>
        </div>
        <div className="stat-label spaced">Swing per hand · last {Math.min(50, handCount)}</div>
        <SwingBars values={rows.slice(-50).map((r) => r.swing)} firstHand={rows.slice(-50)[0].hand.number} />
      </Section>

      <Section title="Recent form" aside={<Segmented label="Hands" options={[5, 10, 25].map((v) => ({ value: v, label: String(v) }))} value={formSize} onChange={setFormSize} />}>
        <p className="footnote">
          {form.hands < formSize ? `Only ${handsLabel(form.hands)} so far.` : `Hands ${num(form.firstHand)}–${num(handCount)}.`}
        </p>
        <table className="h2h">
          <thead>
            <tr>
              <th />
              <th className="c-scott">Scott</th>
              <th className="c-ellen">Ellen</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Points scored</th>
              <td>{num(form.players.scott.points)}</td>
              <td>{num(form.players.ellen.points)}</td>
            </tr>
            <tr>
              <th>Points per hand</th>
              <td>{dec(form.players.scott.avg)}</td>
              <td>{dec(form.players.ellen.avg)}</td>
            </tr>
            <tr>
              <th>Scoring hands</th>
              <td>{num(form.players.scott.scoringHands)}</td>
              <td>{num(form.players.ellen.scoringHands)}</td>
            </tr>
            <tr>
              <th>Zero-point hands</th>
              <td>{num(form.players.scott.zeroHands)}</td>
              <td>{num(form.players.ellen.zeroHands)}</td>
            </tr>
            <tr>
              <th>Net change in margin</th>
              <td>{margin(form.players.scott.netDiff)}</td>
              <td>{margin(form.players.ellen.netDiff)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Lifetime">
        <div className="grid2">
          <Stat label="Total hands" value={num(handCount)} />
          <Stat label="Hands with no points" value={num(stats.tiedHands)} sub="equal leftovers" />
          <Stat label="Scott total" who="scott" value={num(stats.scottTotal)} />
          <Stat label="Ellen total" who="ellen" value={num(stats.ellenTotal)} />
          <Stat label="Points per hand" value={dec(stats.avgPointsPerHand)} sub="both players" />
          <Stat label="Leftover per hand" value={dec(stats.avgLeftover)} sub={`median ${dec(stats.medianLeftover)}`} />
          <Stat label="Biggest single hand" who={stats.biggestHand?.player} value={stats.biggestHand ? num(stats.biggestHand.value) : '—'} sub={stats.biggestHand ? `${name(stats.biggestHand.player)} · hand ${num(stats.biggestHand.hand)}` : undefined} />
          <Stat label="Biggest comeback" who={stats.biggestComeback?.player} value={stats.biggestComeback ? num(stats.biggestComeback.deficit) : '—'} sub={stats.biggestComeback ? `${name(stats.biggestComeback.player)} · retook lead hand ${num(stats.biggestComeback.reclaimHand)}` : 'No comebacks yet'} />
          <Stat label="Biggest lead" who={stats.biggestLead?.player} value={stats.biggestLead ? num(stats.biggestLead.value) : '—'} sub={stats.biggestLead ? `${name(stats.biggestLead.player)} · hand ${num(stats.biggestLead.hand)}` : undefined} />
          <Stat label="Closest race" value={stats.closestRace ? num(stats.closestRace.value) : '—'} sub={stats.closestRace ? `hand ${num(stats.closestRace.hand)}${stats.closestRace.occurrences > 1 ? ` · ${num(stats.closestRace.occurrences)}×` : ''}` : 'Never apart'} />
        </div>
      </Section>
    </div>
  );
}
