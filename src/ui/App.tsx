import { useCallback, useEffect, useRef, useState } from 'react';
import { computeStats, type RivalryStats } from '../engine/stats';
import type { Hand, HandInput } from '../engine/types';
import { name, num } from './format';
import { HandEntry } from './HandEntry';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Players } from './screens/Players';
import { Records } from './screens/Records';
import { Rivalry } from './screens/Rivalry';
import { store, useStats } from './store';
import { useTheme } from './theme';

type Tab = 'home' | 'rivalry' | 'players' | 'records' | 'hands';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Score', icon: 'M4 18V6m8 12V9m8 9V4' },
  { id: 'rivalry', label: 'Rivalry', icon: 'M3 17l5-6 4 3 5-8 4 5' },
  { id: 'players', label: 'Players', icon: 'M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5m0-5c1-.6 2-1 3-1 3 0 5 2 5 5' },
  { id: 'records', label: 'Records', icon: 'M7 4h10v4a5 5 0 01-10 0V4zm5 9v4m-4 3h8M7 6H4v1a3 3 0 003 3m10-4h3v1a3 3 0 01-3 3' },
  { id: 'hands', label: 'Hands', icon: 'M5 6h14M5 12h14M5 18h9' },
];

interface Toast {
  id: number;
  text: string;
  sub?: string;
  undo?: boolean;
}

type Entry = { mode: 'new' } | { mode: 'edit'; hand: Hand } | null;

/** Records this hand set, comparing lifetime bests before and after. */
function brokenRecords(before: RivalryStats, after: RivalryStats): string[] {
  if (before.handCount === 0) return [];
  const out: string[] = [];
  const bh = after.biggestHand;
  if (bh && bh.value > (before.biggestHand?.value ?? 0)) out.push(`Biggest hand: ${name(bh.player)} ${bh.value}`);
  // Leads grow hand by hand, so only announce the hand that first breaks the old record.
  const bl = after.biggestLead;
  const prevBl = before.biggestLead;
  if (bl && prevBl && bl.value > prevBl.value && prevBl.hand !== after.handCount - 1) out.push(`Biggest lead: ${name(bl.player)} by ${bl.value}`);
  const bc = after.biggestComeback;
  if (bc && bc.deficit > (before.biggestComeback?.deficit ?? 0)) out.push(`Biggest comeback: ${name(bc.player)} from ${bc.deficit} down`);
  const ll = after.longestLead;
  const prevLl = before.longestLead;
  if (ll && prevLl && ll.leader !== 'tie' && ll.hands > prevLl.hands && ll.startHand !== prevLl.startHand) out.push(`Longest lead: ${name(ll.leader)}, ${ll.hands} hands`);
  return out;
}

export function App() {
  const stats = useStats();
  const [tab, setTab] = useState<Tab>('home');
  const [entry, setEntry] = useState<Entry>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pulse, setPulse] = useState(0);
  const [theme, setTheme] = useTheme();
  const toastTimer = useRef<number | undefined>(undefined);
  const mainRef = useRef<HTMLElement>(null);

  const showToast = useCallback((t: Omit<Toast, 'id'>, ms = 5000) => {
    window.clearTimeout(toastTimer.current);
    setToast({ ...t, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);
  const notify = useCallback((text: string) => showToast({ text }, 3000), [showToast]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const undo = useCallback(() => {
    const removed = store.undoLast();
    if (removed) showToast({ text: `Hand ${num(removed.number)} removed` }, 3000);
  }, [showToast]);

  const save = useCallback(
    (input: HandInput) => {
      if (entry?.mode === 'edit') {
        store.edit(entry.hand.id, input);
        setEntry(null);
        notify(`Hand ${num(entry.hand.number)} updated — totals recalculated`);
        return;
      }
      const before = computeStats(store.getHands());
      const hand = store.add(input);
      const after = computeStats(store.getHands());
      setEntry(null);
      setTab('home');
      const last = after.rows[after.rows.length - 1];
      const scorer = hand.scottPoints ? 'scott' : hand.ellenPoints ? 'ellen' : null;
      const records = brokenRecords(before, after);
      if (last.leadChanged || records.length) setPulse((p) => p + 1);
      showToast(
        {
          text: `Hand ${num(hand.number)} saved · ${scorer ? `${name(scorer)} +${num(hand.scottPoints + hand.ellenPoints)}` : 'no points'}`,
          sub: [last.leadChanged ? `${name(last.leader as 'scott' | 'ellen')} takes the lead` : '', ...records.map((r) => `New record — ${r}`)].filter(Boolean).join(' · ') || undefined,
          undo: true,
        },
        records.length || last.leadChanged ? 7000 : 5000,
      );
    },
    [entry, notify, showToast],
  );

  const cancel = useCallback(() => setEntry(null), []);

  return (
    <div className={`app ${entry ? 'has-sheet' : ''}`}>
      <header className="topbar">
        <span className="wordmark">THE LONG GAME</span>
      </header>

      <main ref={mainRef} className="main" aria-hidden={entry ? true : undefined}>
        {tab === 'home' && <Home stats={stats} pulse={pulse} onRecord={() => setEntry({ mode: 'new' })} onOpenHistory={() => setTab('hands')} />}
        {tab === 'rivalry' && <Rivalry stats={stats} />}
        {tab === 'players' && <Players stats={stats} />}
        {tab === 'records' && <Records stats={stats} />}
        {tab === 'hands' && <History stats={stats} onEdit={(hand) => setEntry({ mode: 'edit', hand })} onUndo={undo} notify={notify} theme={theme} setTheme={setTheme} />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {toast ? (
        <div className="toast" key={toast.id} role="status">
          <div className="toast-text">
            <div>{toast.text}</div>
            {toast.sub ? <div className="toast-sub">{toast.sub}</div> : null}
          </div>
          {toast.undo ? (
            <button
              className="toast-undo"
              onClick={() => {
                setToast(null);
                undo();
              }}
            >
              UNDO
            </button>
          ) : null}
        </div>
      ) : null}

      {entry ? (
        <HandEntry
          key={entry.mode === 'edit' ? entry.hand.id : 'new'}
          handNumber={entry.mode === 'edit' ? entry.hand.number : stats.handCount + 1}
          diffBefore={entry.mode === 'edit' ? (stats.rows[entry.hand.number - 2]?.diff ?? 0) : stats.diff}
          initial={entry.mode === 'edit' ? entry.hand : undefined}
          editing={entry.mode === 'edit'}
          onSave={save}
          onCancel={cancel}
        />
      ) : null}
    </div>
  );
}
