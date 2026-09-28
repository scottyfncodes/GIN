import { normalizeHands } from '../engine/history';
import { isValidLeftover } from '../engine/scoring';
import type { Hand } from '../engine/types';

export const SCHEMA_VERSION = 1;
export const APP_ID = 'the-long-game';

export interface StoredData {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt?: string;
  hands: Hand[];
}

export class DataError extends Error {}

/**
 * Accepts any historical shape and returns current-schema data.
 * v0: a bare array of hands with `scott`/`ellen` leftovers (pre-release format).
 * v1: { app, schemaVersion: 1, hands: Hand[] }.
 */
export function migrate(raw: unknown): StoredData {
  if (Array.isArray(raw)) {
    return migrate({ app: APP_ID, schemaVersion: 0, hands: raw });
  }
  if (!raw || typeof raw !== 'object') throw new DataError('Not a Long Game data file.');
  const obj = raw as Record<string, unknown>;
  if (obj.app !== undefined && obj.app !== APP_ID) throw new DataError('This file is from a different app.');
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new DataError('This file was made by a newer version of The Long Game.');
  if (!Array.isArray(obj.hands)) throw new DataError('No hand history found in the file.');

  let hands = obj.hands as unknown[];
  if (version < 1) {
    hands = hands.map((h) => {
      if (!h || typeof h !== 'object') return h;
      const o = h as Record<string, unknown>;
      return { ...o, scottLeftover: o.scottLeftover ?? o.scott, ellenLeftover: o.ellenLeftover ?? o.ellen };
    });
  }
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, hands: validateHands(hands) };
}

function validateHands(list: unknown[]): Hand[] {
  const seen = new Set<string>();
  const out: Hand[] = [];
  list.forEach((item, i) => {
    if (!item || typeof item !== 'object') throw new DataError(`Hand ${i + 1} is not valid.`);
    const h = item as Record<string, unknown>;
    if (!isValidLeftover(h.scottLeftover) || !isValidLeftover(h.ellenLeftover)) {
      throw new DataError(`Hand ${i + 1} has an invalid leftover (must be a whole number, 0 or more).`);
    }
    const timestamp = typeof h.timestamp === 'number' && Number.isFinite(h.timestamp) ? h.timestamp : typeof h.timestamp === 'string' ? Date.parse(h.timestamp) : NaN;
    if (!Number.isFinite(timestamp)) throw new DataError(`Hand ${i + 1} has an invalid timestamp.`);
    const id = typeof h.id === 'string' && h.id ? h.id : `import-${i + 1}-${timestamp}`;
    if (seen.has(id)) return; // duplicate hand: keep the first copy
    seen.add(id);
    out.push({
      id,
      number: typeof h.number === 'number' ? h.number : i + 1,
      timestamp,
      scottLeftover: h.scottLeftover,
      ellenLeftover: h.ellenLeftover,
      scottPoints: 0,
      ellenPoints: 0,
    });
  });
  // Order by hand number, then time, then position in the file.
  const order = out.map((h, i) => ({ h, i }));
  order.sort((a, b) => a.h.number - b.h.number || a.h.timestamp - b.h.timestamp || a.i - b.i);
  return normalizeHands(order.map((o) => o.h));
}

export function toExport(hands: readonly Hand[], now = new Date()): StoredData {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), hands: normalizeHands(hands) };
}

export function parseImport(text: string): StoredData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DataError('That file isn’t valid JSON.');
  }
  return migrate(raw);
}
