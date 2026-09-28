import { memo, useMemo, useState, type PointerEvent } from 'react';
import { useWidth } from '../useWidth';

export interface Series {
  key: string;
  values: readonly number[];
  className: string;
}

interface Props {
  series: Series[];
  /** Hand number of values[0]. */
  firstHand: number;
  height?: number;
  /** Fill above zero with `aboveClass` and below with `belowClass` (for single-series differential charts). */
  zeroFill?: { aboveClass: string; belowClass: string };
  includeZero?: boolean;
  renderReadout?: (index: number) => React.ReactNode;
  ariaLabel: string;
}

const PAD = { top: 10, right: 8, bottom: 20, left: 40 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

/**
 * Downsamples to about `buckets` points per series, keeping each bucket's
 * min and max so peaks and swings survive on very long histories.
 */
function decimate(values: readonly number[], buckets: number): { i: number; v: number }[] {
  const n = values.length;
  if (n <= buckets * 2) return values.map((v, i) => ({ i, v }));
  const size = n / buckets;
  const out: { i: number; v: number }[] = [];
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(n, Math.floor((b + 1) * size));
    let lo = start;
    let hi = start;
    for (let i = start; i < end; i++) {
      if (values[i] < values[lo]) lo = i;
      if (values[i] > values[hi]) hi = i;
    }
    if (lo === hi) out.push({ i: lo, v: values[lo] });
    else if (lo < hi) out.push({ i: lo, v: values[lo] }, { i: hi, v: values[hi] });
    else out.push({ i: hi, v: values[hi] }, { i: lo, v: values[lo] });
  }
  if (out[out.length - 1].i !== n - 1) out.push({ i: n - 1, v: values[n - 1] });
  return out;
}

export const LineChart = memo(function LineChart({ series, firstHand, height = 200, zeroFill, includeZero, renderReadout, ariaLabel }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.values.length ?? 0;

  const geo = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of series) for (const v of s.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min)) {
      min = 0;
      max = 1;
    }
    if (includeZero || zeroFill) {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    if (min === max) max = min + 1;
    const ticks = niceTicks(min, max);
    const lo = Math.min(min, ticks[0]);
    const hi = Math.max(max, ticks[ticks.length - 1]);
    const plotW = Math.max(10, width - PAD.left - PAD.right);
    const plotH = height - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
    const buckets = Math.max(20, Math.floor(plotW / 2));
    const paths = series.map((s) => {
      const pts = decimate(s.values, buckets);
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
      const area = pts.length
        ? `${d}L${x(pts[pts.length - 1].i).toFixed(1)},${y(0).toFixed(1)}L${x(pts[0].i).toFixed(1)},${y(0).toFixed(1)}Z`
        : '';
      return { key: s.key, className: s.className, d, area };
    });
    return { ticks, x, y, paths, plotW, plotH };
  }, [series, width, height, n, includeZero, zeroFill]);

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const k = n <= 1 ? 0 : Math.round((px / geo.plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, k)));
  };

  const shown = hover ?? n - 1;
  const lastHand = firstHand + n - 1;
  const zeroY = geo.y(0);
  const clipId = `clip-${ariaLabel.replace(/\W/g, '')}`;

  return (
    <div className="chart" ref={ref}>
      {renderReadout && n > 0 ? <div className="chart-readout">{renderReadout(shown)}</div> : null}
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={() => setHover(null)}
        style={{ touchAction: 'pan-y' }}
      >
        {zeroFill ? (
          <defs>
            <clipPath id={`${clipId}-a`}>
              <rect x={0} y={0} width={width} height={Math.max(0, zeroY)} />
            </clipPath>
            <clipPath id={`${clipId}-b`}>
              <rect x={0} y={zeroY} width={width} height={Math.max(0, height - zeroY)} />
            </clipPath>
          </defs>
        ) : null}
        {geo.ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'grid zero' : 'grid'} x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} />
            <text className="axis" x={PAD.left - 6} y={geo.y(t)} dy="0.32em" textAnchor="end">
              {zeroFill ? Math.abs(t) : t}
            </text>
          </g>
        ))}
        {n > 0 ? (
          <>
            <text className="axis" x={PAD.left} y={height - 4}>
              {firstHand}
            </text>
            <text className="axis" x={width - PAD.right} y={height - 4} textAnchor="end">
              {lastHand}
            </text>
            <text className="axis" x={PAD.left + geo.plotW / 2} y={height - 4} textAnchor="middle">
              hand
            </text>
          </>
        ) : null}
        {geo.paths.map((p) =>
          zeroFill ? (
            <g key={p.key}>
              <path d={p.area} className={`area ${zeroFill.aboveClass}`} clipPath={`url(#${clipId}-a)`} />
              <path d={p.area} className={`area ${zeroFill.belowClass}`} clipPath={`url(#${clipId}-b)`} />
              <path d={p.d} className={`line ${zeroFill.aboveClass}`} clipPath={`url(#${clipId}-a)`} />
              <path d={p.d} className={`line ${zeroFill.belowClass}`} clipPath={`url(#${clipId}-b)`} />
            </g>
          ) : (
            <path key={p.key} d={p.d} className={`line ${p.className}`} />
          ),
        )}
        {n > 0 ? (
          <>
            <line className="cursor" x1={geo.x(shown)} x2={geo.x(shown)} y1={PAD.top} y2={PAD.top + geo.plotH} />
            {series.map((s) => (
              <circle key={s.key} className={`dot ${zeroFill ? (s.values[shown] >= 0 ? zeroFill.aboveClass : zeroFill.belowClass) : s.className}`} cx={geo.x(shown)} cy={geo.y(s.values[shown])} r={3.5} />
            ))}
          </>
        ) : null}
      </svg>
    </div>
  );
});
