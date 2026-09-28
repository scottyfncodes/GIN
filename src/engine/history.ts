import { scoreHand } from './scoring';
import type { Hand, HandInput } from './types';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Re-numbers hands 1..n in order and recomputes awarded points from leftovers. */
export function normalizeHands(hands: readonly Hand[]): Hand[] {
  return hands.map((h, i) => {
    const s = scoreHand(h.scottLeftover, h.ellenLeftover);
    return { ...h, number: i + 1, scottPoints: s.scott, ellenPoints: s.ellen };
  });
}

export function appendHand(hands: readonly Hand[], input: HandInput, timestamp = Date.now(), id = newId()): Hand[] {
  const draft: Hand = { id, number: 0, timestamp, ...input, scottPoints: 0, ellenPoints: 0 };
  return normalizeHands([...hands, draft]);
}

export function editHand(hands: readonly Hand[], id: string, input: HandInput): Hand[] {
  return normalizeHands(hands.map((h) => (h.id === id ? { ...h, ...input } : h)));
}

export function deleteHand(hands: readonly Hand[], id: string): Hand[] {
  return normalizeHands(hands.filter((h) => h.id !== id));
}

export function removeLastHand(hands: readonly Hand[]): Hand[] {
  return hands.slice(0, -1);
}
