import { appendHand, deleteHand, editHand, removeLastHand } from '../engine/history';
import type { Hand, HandInput } from '../engine/types';
import { APP_ID, migrate, SCHEMA_VERSION } from './schema';

export const STORAGE_KEY = `${APP_ID}:data`;
export const BACKUP_KEY = `${APP_ID}:backup`;

type Listener = () => void;

export interface Store {
  getHands(): readonly Hand[];
  subscribe(fn: Listener): () => void;
  add(input: HandInput, timestamp?: number): Hand;
  edit(id: string, input: HandInput): void;
  remove(id: string): void;
  undoLast(): Hand | null;
  replaceAll(hands: readonly Hand[]): void;
  reset(): void;
  lastError(): string | null;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadHands(storage: Storage | null = safeStorage()): { hands: Hand[]; error: string | null } {
  if (!storage) return { hands: [], error: null };
  const text = storage.getItem(STORAGE_KEY);
  if (!text) return { hands: [], error: null };
  try {
    return { hands: migrate(JSON.parse(text)).hands, error: null };
  } catch (err) {
    // Keep the unreadable copy so nothing is lost, and start from empty.
    storage.setItem(`${APP_ID}:unreadable-${Date.now()}`, text);
    return { hands: [], error: (err as Error).message };
  }
}

export function createStore(storage: Storage | null = safeStorage()): Store {
  const loaded = loadHands(storage);
  let hands: readonly Hand[] = loaded.hands;
  let error: string | null = loaded.error;
  const listeners = new Set<Listener>();

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION, hands }));
      error = null;
    } catch (err) {
      error = `Couldn’t save: ${(err as Error).message}`;
    }
  };
  const set = (next: readonly Hand[]) => {
    hands = next;
    persist();
    listeners.forEach((fn) => fn());
  };
  const backup = () => {
    try {
      storage?.setItem(BACKUP_KEY, JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION, savedAt: Date.now(), hands }));
    } catch {
      /* best effort */
    }
  };

  return {
    getHands: () => hands,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    add(input, timestamp = Date.now()) {
      set(appendHand(hands, input, timestamp));
      return hands[hands.length - 1];
    },
    edit: (id, input) => set(editHand(hands, id, input)),
    remove: (id) => set(deleteHand(hands, id)),
    undoLast() {
      const last = hands[hands.length - 1] ?? null;
      if (last) set(removeLastHand(hands));
      return last;
    },
    replaceAll(next) {
      backup();
      set(next);
    },
    reset() {
      backup();
      set([]);
    },
    lastError: () => error,
  };
}
