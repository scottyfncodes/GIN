import { memo } from 'react';
import { num } from '../format';

/** Paired horizontal bars comparing Scott and Ellen per bucket (as % of each player's hands). */
export const PairedBars = memo(function PairedBars({ labels, scott, ellen, unit }: { labels: string[]; scott: number[]; ellen: number[]; unit: string }) {
  const sTotal = scott.reduce((a, b) => a + b, 0) || 1;
  const eTotal = ellen.reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...scott.map((v) => v / sTotal), ...ellen.map((v) => v / eTotal), 0.0001);
  return (
    <div className="pbars" role="table" aria-label={`Distribution of ${unit}`}>
      {labels.map((l, i) => (
        <div className="pbar-row" role="row" key={l}>
          <div className="pbar-label" role="rowheader">{l}</div>
          <div className="pbar-tracks">
            {([['scott', scott[i], sTotal], ['ellen', ellen[i], eTotal]] as const).map(([p, v, t]) => (
              <div className="pbar-track" role="cell" key={p}>
                <div className={`pbar-fill fill-${p}`} style={{ width: `${((v / t) / max) * 100}%` }} />
                <span className="pbar-num">
                  {num(v)} <small>{Math.round((v / t) * 100)}%</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

/** Signed per-hand bars: up = toward Scott, down = toward Ellen. */
export const SwingBars = memo(function SwingBars({ values, firstHand }: { values: number[]; firstHand: number }) {
  const h = 90;
  const max = Math.max(1, ...values.map(Math.abs));
  const w = 100 / Math.max(values.length, 1);
  return (
    <div className="swingbars">
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" role="img" aria-label="Score differential change per hand">
        <line className="grid zero" x1={0} x2={100} y1={h / 2} y2={h / 2} vectorEffect="non-scaling-stroke" />
        {values.map((v, i) =>
          v === 0 ? null : (
            <rect
              key={i}
              className={v > 0 ? 'fill-scott' : 'fill-ellen'}
              x={i * w + w * 0.12}
              width={w * 0.76}
              y={v > 0 ? h / 2 - (v / max) * (h / 2) : h / 2}
              height={(Math.abs(v) / max) * (h / 2)}
            />
          ),
        )}
      </svg>
      <div className="swingbars-axis">
        <span>Hand {firstHand}</span>
        <span>Hand {firstHand + values.length - 1}</span>
      </div>
    </div>
  );
});
