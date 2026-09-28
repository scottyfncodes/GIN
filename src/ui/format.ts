import type { Leader, Player } from '../engine/types';
import { PLAYER_NAME } from '../engine/types';

const nf = new Intl.NumberFormat('en-US');
export const num = (n: number) => nf.format(n);
export const dec = (n: number, digits = 1) => (Number.isInteger(n) ? nf.format(n) : n.toFixed(digits));
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${num(n)} ${n === 1 ? word : pluralWord}`;
export const handsLabel = (n: number) => plural(n, 'hand');
export const name = (p: Player) => PLAYER_NAME[p];
export const leaderName = (l: Leader) => (l === 'tie' ? 'Tied' : PLAYER_NAME[l]);

/** "2 days, 7 hours" — two most significant units. */
export function duration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'under a minute';
  const units: [number, string][] = [
    [Math.floor(min / 1440), 'day'],
    [Math.floor((min % 1440) / 60), 'hour'],
    [min % 60, 'minute'],
  ];
  const first = units.findIndex(([v]) => v > 0);
  return units
    .slice(first, first + 2)
    .filter(([v]) => v > 0)
    .map(([v, u]) => plural(v, u))
    .join(', ');
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
export const date = (t: number) => dateFmt.format(t);
export const dateTime = (t: number) => `${dateFmt.format(t)} · ${timeFmt.format(t)}`;

export function handRange(a: number, b: number) {
  return a === b ? `Hand ${num(a)}` : `Hands ${num(a)}–${num(b)}`;
}
