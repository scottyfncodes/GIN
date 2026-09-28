import { memo } from 'react';
import type { LeadStretch } from '../../engine/stats';

/** The whole rivalry as one strip, each stretch sized by its number of hands. */
export const LeadStrip = memo(function LeadStrip({ stretches, total }: { stretches: LeadStretch[]; total: number }) {
  if (!total) return null;
  return (
    <div className="leadstrip" role="img" aria-label="Who led, across every hand">
      {stretches.map((s) => (
        <div key={s.startHand} className={`leadstrip-seg bg-${s.leader}`} style={{ flexGrow: s.hands }} title={`${s.leader} ${s.startHand}–${s.endHand}`} />
      ))}
    </div>
  );
});
