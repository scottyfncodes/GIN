import { beforeEach, describe, expect, it } from 'vitest';
import { fromResults } from '../engine/testUtils';
import { DataError, migrate, parseImport, SCHEMA_VERSION, toExport } from './schema';
import { BACKUP_KEY, createStore, STORAGE_KEY } from './store';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('survives a reload (new store over the same storage)', () => {
    const a = createStore(localStorage);
    a.add({ scottLeftover: 0, ellenLeftover: 13 });
    a.add({ scottLeftover: 9, ellenLeftover: 4 });
    const b = createStore(localStorage);
    expect(b.getHands().map((h) => [h.number, h.scottPoints, h.ellenPoints])).toEqual([
      [1, 13, 0],
      [2, 0, 5],
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('persists edits, deletions and undo', () => {
    const a = createStore(localStorage);
    const h1 = a.add({ scottLeftover: 0, ellenLeftover: 13 });
    a.add({ scottLeftover: 1, ellenLeftover: 0 });
    a.add({ scottLeftover: 2, ellenLeftover: 0 });
    a.edit(h1.id, { scottLeftover: 13, ellenLeftover: 0 });
    a.remove(a.getHands()[1].id);
    expect(a.undoLast()?.number).toBe(2);
    const b = createStore(localStorage);
    expect(b.getHands()).toHaveLength(1);
    expect(b.getHands()[0].ellenPoints).toBe(13);
    expect(b.undoLast()).not.toBeNull();
    expect(b.undoLast()).toBeNull();
  });

  it('notifies subscribers', () => {
    const a = createStore(localStorage);
    let calls = 0;
    const off = a.subscribe(() => calls++);
    a.add({ scottLeftover: 1, ellenLeftover: 2 });
    off();
    a.add({ scottLeftover: 1, ellenLeftover: 2 });
    expect(calls).toBe(1);
  });

  it('keeps a backup before reset and never loses unreadable data', () => {
    const a = createStore(localStorage);
    a.add({ scottLeftover: 1, ellenLeftover: 2 });
    a.reset();
    expect(a.getHands()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(BACKUP_KEY)!).hands).toHaveLength(1);

    localStorage.setItem(STORAGE_KEY, '{broken');
    const b = createStore(localStorage);
    expect(b.getHands()).toEqual([]);
    expect(b.lastError()).toBeTruthy();
    const keys = Object.keys(localStorage).filter((k) => k.includes('unreadable'));
    expect(localStorage.getItem(keys[0])).toBe('{broken');
  });

  it('works without storage available', () => {
    const a = createStore(null);
    a.add({ scottLeftover: 1, ellenLeftover: 2 });
    expect(a.getHands()).toHaveLength(1);
  });
});

describe('export / import', () => {
  it('round-trips a full history', () => {
    const hands = fromResults([10, -5, 0, 3]);
    const text = JSON.stringify(toExport(hands));
    expect(parseImport(text).hands).toEqual(hands);
  });

  it('recomputes stale points and numbers on import', () => {
    const hands = fromResults([10, -5]).map((h) => ({ ...h, scottPoints: 999, number: h.number * 10 }));
    const data = parseImport(JSON.stringify({ app: 'the-long-game', schemaVersion: 1, hands }));
    expect(data.hands.map((h) => [h.number, h.scottPoints, h.ellenPoints])).toEqual([
      [1, 10, 0],
      [2, 0, 5],
    ]);
  });

  it('drops duplicate hands by id', () => {
    const hands = fromResults([10, -5]);
    const data = parseImport(JSON.stringify(toExport([...hands, hands[0]])));
    expect(data.hands).toHaveLength(2);
  });

  it.each([
    ['not json', '{nope'],
    ['wrong type', '"hello"'],
    ['other app', JSON.stringify({ app: 'other', hands: [] })],
    ['no hands', JSON.stringify({ app: 'the-long-game', schemaVersion: 1 })],
    ['newer version', JSON.stringify({ app: 'the-long-game', schemaVersion: 99, hands: [] })],
    ['negative', JSON.stringify({ schemaVersion: 1, hands: [{ id: 'a', timestamp: 1, scottLeftover: -1, ellenLeftover: 0 }] })],
    ['decimal', JSON.stringify({ schemaVersion: 1, hands: [{ id: 'a', timestamp: 1, scottLeftover: 1.5, ellenLeftover: 0 }] })],
    ['string number', JSON.stringify({ schemaVersion: 1, hands: [{ id: 'a', timestamp: 1, scottLeftover: '3', ellenLeftover: 0 }] })],
    ['bad timestamp', JSON.stringify({ schemaVersion: 1, hands: [{ id: 'a', timestamp: 'x', scottLeftover: 1, ellenLeftover: 0 }] })],
    ['null hand', JSON.stringify({ schemaVersion: 1, hands: [null] })],
  ])('rejects malformed data: %s', (_, text) => {
    expect(() => parseImport(text)).toThrow(DataError);
  });
});

describe('migration', () => {
  it('migrates a v0 bare array with scott/ellen fields', () => {
    const v0 = [
      { timestamp: 1000, scott: 0, ellen: 13 },
      { timestamp: 2000, scott: 9, ellen: 4 },
    ];
    const data = migrate(v0);
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.hands.map((h) => [h.number, h.scottPoints, h.ellenPoints])).toEqual([
      [1, 13, 0],
      [2, 0, 5],
    ]);
    expect(new Set(data.hands.map((h) => h.id)).size).toBe(2);
  });

  it('loads v0 data found in storage and rewrites it as current schema on next save', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ timestamp: 1000, scott: 0, ellen: 13 }]));
    const s = createStore(localStorage);
    expect(s.getHands()).toHaveLength(1);
    s.add({ scottLeftover: 0, ellenLeftover: 0 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
  });
});
