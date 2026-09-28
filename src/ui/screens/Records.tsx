import { useMemo, useState, type ReactNode } from 'react';
import { computeMoments } from '../../engine/moments';
import type { RivalryStats } from '../../engine/stats';
import { stretchDuration } from '../../engine/stats';
import type { Player } from '../../engine/types';
import { Empty, Section } from '../bits';
import { dateTime, duration, handRange, name, num, plural } from '../format';

function Record({ title, desc, value, who, detail }: { title: string; desc: string; value: ReactNode; who?: Player | null; detail?: ReactNode }) {
  return (
    <li className={`record ${who ? `who-${who}` : ''}`}>
      <div className="record-main">
        <div className="record-title">{title}</div>
        <div className="record-desc">{desc}</div>
      </div>
      <div className="record-side">
        <div className="record-value">{value}</div>
        {detail ? <div className="record-detail">{detail}</div> : null}
      </div>
    </li>
  );
}

export function Records({ stats }: { stats: RivalryStats }) {
  const moments = useMemo(() => computeMoments(stats).reverse(), [stats]);
  const [momentCount, setMomentCount] = useState(30);
  const [comebackCount, setComebackCount] = useState(10);

  if (stats.handCount === 0) {
    return (
      <div className="screen">
        <h1 className="screen-title">Record Book</h1>
        <Empty>No records yet — they’ll be set by real hands.</Empty>
      </div>
    );
  }

  const { players: P } = stats;
  const better = <T,>(a: T | null, b: T | null, key: (x: T) => number): [Player, T] | null => {
    if (!a && !b) return null;
    if (a && (!b || key(a) >= key(b))) return ['scott', a];
    return ['ellen', b as T];
  };
  const scoring = better(P.scott.longestScoringStreak, P.ellen.longestScoringStreak, (s) => s.length);
  const shutout = better(P.scott.longestShutoutStreak, P.ellen.longestShutoutStreak, (s) => s.length);
  const run = better(P.scott.biggestRun, P.ellen.biggestRun, (r) => r.points);
  const lead = stats.longestLead;
  const notable = [...stats.comebacks].sort((a, b) => b.deficit - a.deficit || a.reclaimHand - b.reclaimHand);

  return (
    <div className="screen">
      <h1 className="screen-title">Record Book</h1>

      <Section title="Records">
        <ul className="records">
          <Record title="Biggest hand" desc="Most points in a single hand" who={stats.biggestHand?.player} value={stats.biggestHand ? num(stats.biggestHand.value) : '—'} detail={stats.biggestHand ? `${name(stats.biggestHand.player)} · hand ${num(stats.biggestHand.hand)}` : null} />
          <Record title="Biggest lead" desc="Largest advantage ever held" who={stats.biggestLead?.player} value={stats.biggestLead ? num(stats.biggestLead.value) : '—'} detail={stats.biggestLead ? `${name(stats.biggestLead.player)} · hand ${num(stats.biggestLead.hand)}` : 'Always level'} />
          <Record title="Biggest comeback" desc="Largest deficit overcome to take the lead" who={stats.biggestComeback?.player} value={stats.biggestComeback ? num(stats.biggestComeback.deficit) : '—'} detail={stats.biggestComeback ? `${name(stats.biggestComeback.player)} · down at ${num(stats.biggestComeback.deficitHand)}, led at ${num(stats.biggestComeback.reclaimHand)}` : 'No lead has been overturned yet'} />
          <Record title="Biggest swing" desc="Largest change in the differential from one hand to the next" who={stats.biggestSwing?.player} value={stats.biggestSwing ? num(stats.biggestSwing.value) : '—'} detail={stats.biggestSwing ? `${name(stats.biggestSwing.player)} · hand ${num(stats.biggestSwing.hand)}` : null} />
          <Record title="Biggest run" desc="Most unanswered points (ties don’t interrupt)" who={run?.[0]} value={run ? num(run[1].points) : '—'} detail={run ? `${name(run[0])} · ${handRange(run[1].startHand, run[1].endHand)}${run[1].ongoing ? ' · live' : ''}` : null} />
          <Record title="Longest lead" desc="Most consecutive hands in front" who={lead && lead.leader !== 'tie' ? lead.leader : null} value={lead ? num(lead.hands) : '—'} detail={lead && lead.leader !== 'tie' ? `${name(lead.leader)} · ${handRange(lead.startHand, lead.endHand)} · ${duration(stretchDuration(lead))}${lead.ongoing ? ' · live' : ''}` : 'Nobody has led'} />
          <Record title="Longest scoring streak" desc="Most consecutive hands scoring points" who={scoring?.[0]} value={scoring ? num(scoring[1].length) : '—'} detail={scoring ? `${name(scoring[0])} · ${handRange(scoring[1].startHand, scoring[1].endHand)}${scoring[1].ongoing ? ' · live' : ''}` : 'No points yet'} />
          <Record title="Longest shutout streak" desc="Most consecutive hands receiving 0" who={shutout?.[0]} value={shutout ? num(shutout[1].length) : '—'} detail={shutout ? `${name(shutout[0])} · ${handRange(shutout[1].startHand, shutout[1].endHand)}${shutout[1].ongoing ? ' · live' : ''}` : null} />
          <Record title="Closest race" desc="Smallest non-zero gap in the totals" value={stats.closestRace ? num(stats.closestRace.value) : '—'} detail={stats.closestRace ? `hand ${num(stats.closestRace.hand)}${stats.closestRace.occurrences > 1 ? ` (most recent of ${num(stats.closestRace.occurrences)})` : ''}` : 'Never apart'} />
          <Record title="Closest hand" desc="Smallest non-zero points in a hand" who={stats.closestHand?.player} value={stats.closestHand ? num(stats.closestHand.value) : '—'} detail={stats.closestHand ? `${name(stats.closestHand.player)} · hand ${num(stats.closestHand.hand)}${stats.closestHand.occurrences > 1 ? ` (most recent of ${num(stats.closestHand.occurrences)})` : ''}` : null} />
        </ul>
      </Section>

      <Section title="Comebacks">
        {stats.biggestComeback ? (
          <div className={`comeback-hero who-${stats.biggestComeback.player}`}>
            <div className="stat-label">Biggest comeback</div>
            <div className="comeback-name">{name(stats.biggestComeback.player)}</div>
            <div className="comeback-line">Recovered from {plural(stats.biggestComeback.deficit, 'point')} behind.</div>
          </div>
        ) : (
          <Empty>No comebacks yet. A comeback counts only when a player who was behind actually retakes the lead.</Empty>
        )}
        {notable.length ? (
          <>
            <table className="h2h comebacks">
              <thead>
                <tr>
                  <th>Player</th>
                  <td>Deficit</td>
                  <td>Down most</td>
                  <td>Led again</td>
                </tr>
              </thead>
              <tbody>
                {notable.slice(0, comebackCount).map((c) => (
                  <tr key={`${c.player}-${c.reclaimHand}`}>
                    <th className={`c-${c.player}`}>{name(c.player)}</th>
                    <td>{num(c.deficit)}</td>
                    <td>#{num(c.deficitHand)}</td>
                    <td>#{num(c.reclaimHand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {notable.length > comebackCount ? (
              <button className="text-btn more" onClick={() => setComebackCount((n) => n + 20)}>
                Show more ({num(notable.length - comebackCount)} left)
              </button>
            ) : null}
          </>
        ) : null}
      </Section>

      <Section title="Timeline">
        {moments.length === 0 ? (
          <Empty>Notable moments appear here as they happen.</Empty>
        ) : (
          <ol className="moments">
            {moments.slice(0, momentCount).map((m, i) => (
              <li key={`${m.kind}-${m.hand}-${i}`} className={`moment ${m.player ? `who-${m.player}` : ''} kind-${m.kind}`}>
                <span className="moment-icon" aria-hidden="true">{m.icon}</span>
                <div className="moment-body">
                  <div className="moment-title">{m.title}</div>
                  {m.detail ? <div className="moment-detail">{m.detail}</div> : null}
                  <div className="moment-when">
                    Hand {num(m.hand)} · {dateTime(m.timestamp)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        {moments.length > momentCount ? (
          <button className="text-btn more" onClick={() => setMomentCount((n) => n + 50)}>
            Show earlier moments
          </button>
        ) : null}
      </Section>
    </div>
  );
}
