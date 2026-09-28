import { useCallback, useEffect, useState } from 'react';
import { MAX_LEFTOVER, parseLeftover, scoreHand } from '../engine/scoring';
import type { HandInput, Leader, Player } from '../engine/types';
import { name, num } from './format';

interface Props {
  handNumber: number;
  /** Score differential (Scott − Ellen) before this hand, for the lead preview. */
  diffBefore: number;
  initial?: HandInput;
  editing?: boolean;
  onSave: (input: HandInput) => void;
  onCancel: () => void;
}

const MAX_DIGITS = String(MAX_LEFTOVER).length;

function leaderOf(diff: number): Leader {
  return diff > 0 ? 'scott' : diff < 0 ? 'ellen' : 'tie';
}

export function HandEntry({ handNumber, diffBefore, initial, editing, onSave, onCancel }: Props) {
  const [text, setText] = useState<Record<Player, string>>({
    scott: initial ? String(initial.scottLeftover) : '',
    ellen: initial ? String(initial.ellenLeftover) : '',
  });
  const [active, setActive] = useState<Player>('scott');
  const [fresh, setFresh] = useState(Boolean(initial));

  const scott = parseLeftover(text.scott);
  const ellen = parseLeftover(text.ellen);
  const ready = scott !== null && ellen !== null;
  const result = ready ? scoreHand(scott, ellen) : null;
  const diffAfter = result ? diffBefore + result.scott - result.ellen : diffBefore;
  const before = leaderOf(diffBefore);
  const after = leaderOf(diffAfter);
  const leadChange = result !== null && after !== 'tie' && before !== 'tie' && after !== before;

  const press = useCallback(
    (key: string) => {
      if (key === 'next') {
        setActive((a) => (a === 'scott' ? 'ellen' : 'scott'));
        setFresh(true);
        return;
      }
      setText((t) => {
        const cur = fresh ? '' : t[active];
        let next = cur;
        if (key === 'back') next = fresh ? '' : cur.slice(0, -1);
        else if (key === 'clear') next = '';
        else if (/^\d$/.test(key)) next = cur === '0' ? key : cur.length >= MAX_DIGITS ? cur : cur + key;
        return { ...t, [active]: next };
      });
      setFresh(false);
    },
    [active, fresh],
  );

  const save = useCallback(() => {
    if (scott !== null && ellen !== null) onSave({ scottLeftover: scott, ellenLeftover: ellen });
  }, [scott, ellen, onSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') press('next');
      else if (e.key === 'Enter') {
        if (ready) save();
        else press('next');
      } else if (e.key === 'Escape') onCancel();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, save, ready, onCancel]);

  // Typing a leftover for Scott then pressing a digit feels natural; auto-advance after "0" since 0 is final.
  const onDigit = (d: string) => {
    press(d);
    if (d === '0' && active === 'scott' && (fresh || text.scott === '' || text.scott === '0') && text.ellen === '') {
      setActive('ellen');
      setFresh(true);
    }
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={editing ? `Edit hand ${handNumber}` : `Record hand ${handNumber}`}>
      <div className="sheet-top">
        <button className="text-btn" onClick={onCancel}>
          Cancel
        </button>
        <div className="sheet-title">
          {editing ? 'EDIT ' : ''}HAND {num(handNumber)}
        </div>
        <span className="text-btn-spacer" />
      </div>

      <div className="entry-fields">
        {(['scott', 'ellen'] as const).map((p) => (
          <button
            key={p}
            className={`entry-field who-${p} ${active === p ? 'active' : ''} ${active === p && fresh ? 'fresh' : ''}`}
            onClick={() => {
              setActive(p);
              setFresh(text[p] !== '');
            }}
            aria-label={`${name(p)} leftover: ${text[p] || 'empty'}`}
            aria-pressed={active === p}
          >
            <span className="entry-name">{name(p)} leftover</span>
            <span className="entry-value">{text[p] === '' ? <span className="placeholder">–</span> : num(Number(text[p]))}</span>
          </button>
        ))}
      </div>

      <div className={`entry-result ${result?.scorer ? `who-${result.scorer}` : ''}`} aria-live="polite">
        {!result ? (
          <span className="entry-hint">Enter both leftovers</span>
        ) : result.scorer ? (
          <>
            <span className="entry-award">
              {name(result.scorer).toUpperCase()} +{num(result.points)}
            </span>
            <span className="entry-after">
              {leadChange ? <strong className="lead-flag">LEAD CHANGE · </strong> : null}
              {after === 'tie' ? 'All square' : `${name(after)} leads by ${num(Math.abs(diffAfter))}`}
            </span>
          </>
        ) : (
          <>
            <span className="entry-award">NO POINTS</span>
            <span className="entry-after">Equal leftovers</span>
          </>
        )}
      </div>

      <button className="primary-btn save-btn" disabled={!ready} onClick={save}>
        {editing ? 'SAVE CHANGES' : 'SAVE HAND'}
      </button>

      <div className="keypad" aria-label="Number pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => onDigit(d)}>
            {d}
          </button>
        ))}
        <button className="key-muted" onClick={() => press('back')} aria-label="Delete digit">
          ⌫
        </button>
        <button onClick={() => onDigit('0')}>0</button>
        <button className="key-muted" onClick={() => press('next')} aria-label={active === 'scott' ? 'Next: Ellen' : 'Back to Scott'}>
          {active === 'scott' ? 'Ellen ↓' : 'Scott ↑'}
        </button>
      </div>
    </div>
  );
}
