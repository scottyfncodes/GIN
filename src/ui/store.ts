import { useMemo, useSyncExternalStore } from 'react';
import { computeStats } from '../engine/stats';
import { createStore } from '../storage/store';

export const store = createStore();

export function useHands() {
  return useSyncExternalStore(store.subscribe, store.getHands, store.getHands);
}

export function useStats() {
  const hands = useHands();
  return useMemo(() => computeStats(hands), [hands]);
}
