import type { RivalryStats } from '../../engine/stats';
import { stretchDuration } from '../../engine/stats';
import { AnimatedNumber } from '../bits';
import { duration, handsLabel, name, num } from '../format';

interface Props {
  stats: RivalryStats;
  onRecord: () => void;
  onOpenHistory: () => void;
  pulse: number;
}

export function Home({ stats, onRecord, onOpenHistory, pulse }: Props) {
  const { handCount, leader, lead } = stats;

  if (handCount === 0) {
    return (
      <div className="home home-empty">
        <div className="empty-hero">
          <div className="wordmark big">THE LONG GAME</div>
          <div className="empty-vs">
            <span className="c-scott">Scott</span> vs <span className="c-ellen">Ellen</span>
          </div>
          <p className="empty-tag">A game with no end.</p>
          <div className="hand-count">0 HANDS</div>
        </div>
        <button className="primary-btn record-btn" onClick={onRecord}>
          RECORD FIRST HAND
        </button>
      </div>
    );
  }

  const current = stats.stretches[stats.stretches.length - 1];
  const recent = stats.rows.slice(-5).reverse();

  return (
    <div className="home">
      <div className="scoreboard">
        {(['scott', 'ellen'] as const).map((p) => (
          <div key={p} className={`score who-${p} ${leader === p ? 'leading' : ''} ${leader !== 'tie' && leader !== p ? 'trailing' : ''}`}>
            <div className="score-name">{name(p).toUpperCase()}</div>
            <AnimatedNumber className="score-num" value={p === 'scott' ? stats.scottTotal : stats.ellenTotal} />
          </div>
        ))}
      </div>

      <div key={`${leader}-${pulse}`} className={`lead-banner who-${leader} ${pulse ? 'pop' : ''}`}>
        {leader === 'tie' ? 'ALL SQUARE' : `${name(leader).toUpperCase()} LEADS BY ${num(lead)}`}
      </div>
      <div className="lead-since">
        {leader === 'tie'
          ? `Level for ${handsLabel(current.hands)}`
          : `${name(leader)} has led for ${handsLabel(current.hands)} · ${duration(stretchDuration(current))}`}
      </div>
      <div className="hand-count">{handsLabel(handCount).toUpperCase()}</div>

      <button className="primary-btn record-btn" onClick={onRecord}>
        RECORD HAND
      </button>

      <div className="recent">
        <button className="recent-head" onClick={onOpenHistory}>
          <span>Recent hands</span>
          <span className="recent-all">All hands ›</span>
        </button>
        <ol className="recent-list">
          {recent.map((r) => {
            const scorer = r.swing > 0 ? 'scott' : r.swing < 0 ? 'ellen' : null;
            return (
              <li key={r.hand.id} className="recent-row">
                <span className="recent-n">#{num(r.hand.number)}</span>
                <span className="recent-lo">
                  <span className="c-scott">{num(r.hand.scottLeftover)}</span>
                  <span className="sep">·</span>
                  <span className="c-ellen">{num(r.hand.ellenLeftover)}</span>
                </span>
                <span className={`recent-award ${scorer ? `c-${scorer}` : 'muted'}`}>
                  {scorer ? `${name(scorer).toUpperCase()} +${num(Math.abs(r.swing))}` : 'NO POINTS'}
                </span>
                {r.leadChanged ? <span className="tag">LEAD</span> : <span className="tag-spacer" />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
