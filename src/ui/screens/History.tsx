import { useRef, useState } from 'react';
import type { RivalryStats } from '../../engine/stats';
import type { Hand } from '../../engine/types';
import { DataError, parseImport, toExport } from '../../storage/schema';
import { Empty, Section, Segmented } from '../bits';
import { dateTime, handsLabel, name, num } from '../format';
import { store } from '../store';
import type { ThemePref } from '../theme';

interface Props {
  stats: RivalryStats;
  onEdit: (hand: Hand) => void;
  onUndo: () => void;
  notify: (msg: string) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
}

const PAGE = 50;

export function History({ stats, onEdit, onUndo, notify, theme, setTheme }: Props) {
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ hands: Hand[]; file: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetText, setResetText] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = stats.rows;
  const shown = rows.slice(Math.max(0, rows.length - limit)).reverse();

  const exportData = () => {
    const data = toExport(store.getHands());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-long-game-${new Date().toISOString().slice(0, 10)}-${data.hands.length}-hands.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${handsLabel(data.hands.length)}`);
  };

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    setPendingImport(null);
    if (!file) return;
    try {
      const data = parseImport(await file.text());
      setPendingImport({ hands: data.hands, file: file.name });
    } catch (err) {
      setImportError(err instanceof DataError ? err.message : 'Couldn’t read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmDelete = (h: Hand) => {
    if (window.confirm(`Delete hand ${h.number}? Every later total will be recalculated.`)) {
      store.remove(h.id);
      setOpenId(null);
      notify(`Hand ${h.number} deleted`);
    }
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Hands</h1>

      {rows.length === 0 ? (
        <Empty>No hands yet.</Empty>
      ) : (
        <>
          <div className="history-actions">
            <span className="muted">{handsLabel(rows.length)}</span>
            <button className="ghost-btn" onClick={onUndo}>
              Undo hand {num(rows.length)}
            </button>
          </div>
          <ol className="history">
            {shown.map((r) => {
              const h = r.hand;
              const scorer = r.swing > 0 ? 'scott' : r.swing < 0 ? 'ellen' : null;
              const open = openId === h.id;
              return (
                <li key={h.id} className={`hand ${open ? 'open' : ''}`}>
                  <button className="hand-main" onClick={() => setOpenId(open ? null : h.id)} aria-expanded={open}>
                    <div className="hand-top">
                      <span className="hand-n">HAND {num(h.number)}</span>
                      <span className="hand-time">{dateTime(h.timestamp)}</span>
                    </div>
                    <div className="hand-body">
                      <div className="hand-lo">
                        <span>
                          Scott: <b className="c-scott">{num(h.scottLeftover)}</b>
                        </span>
                        <span>
                          Ellen: <b className="c-ellen">{num(h.ellenLeftover)}</b>
                        </span>
                      </div>
                      <div className={`hand-award ${scorer ? `c-${scorer}` : 'muted'}`}>
                        {scorer ? `${name(scorer).toUpperCase()} +${num(Math.abs(r.swing))}` : 'NO POINTS'}
                      </div>
                    </div>
                    <div className="hand-running">
                      <span>Running total</span>
                      <span className="c-scott">Scott {num(r.scottTotal)}</span>
                      <span className="c-ellen">Ellen {num(r.ellenTotal)}</span>
                      {r.leadChanged ? <span className="tag">LEAD CHANGE</span> : null}
                    </div>
                  </button>
                  {open ? (
                    <div className="hand-tools">
                      <button className="ghost-btn" onClick={() => onEdit(h)}>
                        Edit
                      </button>
                      <button className="ghost-btn danger" onClick={() => confirmDelete(h)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {rows.length > limit ? (
            <button className="text-btn more" onClick={() => setLimit((l) => l + PAGE * 2)}>
              Show earlier hands ({num(rows.length - limit)} more)
            </button>
          ) : null}
        </>
      )}

      <Section title="Appearance">
        <Segmented
          label="Theme"
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </Section>

      <Section title="Data">
        <p className="footnote">Everything is stored privately on this device. Export regularly to keep a backup.</p>
        <div className="data-actions">
          <button className="ghost-btn" onClick={exportData} disabled={rows.length === 0}>
            Export data (JSON)
          </button>
          <button className="ghost-btn" onClick={() => fileRef.current?.click()}>
            Import data…
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {importError ? <p className="error-note">{importError}</p> : null}
        {pendingImport ? (
          <div className="confirm-box">
            <p>
              <b>{pendingImport.file}</b> contains {handsLabel(pendingImport.hands.length)}.{' '}
              {rows.length ? `This will replace the ${handsLabel(rows.length)} on this device.` : ''}
            </p>
            <div className="data-actions">
              <button
                className="ghost-btn danger"
                onClick={() => {
                  store.replaceAll(pendingImport.hands);
                  notify(`Imported ${handsLabel(pendingImport.hands.length)}`);
                  setPendingImport(null);
                }}
              >
                Replace with imported data
              </button>
              <button className="ghost-btn" onClick={() => setPendingImport(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="danger-zone">
          {!resetOpen ? (
            <button className="text-btn danger" onClick={() => setResetOpen(true)} disabled={rows.length === 0}>
              Reset all data…
            </button>
          ) : (
            <div className="confirm-box">
              <p>
                This permanently erases all {handsLabel(rows.length)}. Export first if you might want them back. Type <b>RESET</b> to confirm.
              </p>
              <input className="text-input" value={resetText} onChange={(e) => setResetText(e.target.value)} autoCapitalize="characters" autoComplete="off" aria-label="Type RESET to confirm" />
              <div className="data-actions">
                <button
                  className="ghost-btn danger"
                  disabled={resetText.trim() !== 'RESET'}
                  onClick={() => {
                    store.reset();
                    setResetOpen(false);
                    setResetText('');
                    notify('All data reset');
                  }}
                >
                  Reset all data
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => {
                    setResetOpen(false);
                    setResetText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="version">
          The Long Game v{__APP_VERSION__} · built {new Date(__BUILT_AT__).toLocaleString()}
        </p>
      </Section>
    </div>
  );
}
