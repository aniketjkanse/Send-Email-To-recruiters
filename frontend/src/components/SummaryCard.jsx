import { useEffect, useRef, useState } from 'react';

const TONE_ICON = {
  default: 'analytics',
  success: 'check_circle',
  warning: 'schedule',
  danger: 'error'
};

const TONE_COLOR = {
  default: 'bg-accent/15 text-accent',
  success: 'bg-emerald-500/15 text-emerald-500',
  warning: 'bg-amber-500/15 text-amber-500',
  danger: 'bg-red-500/15 text-red-500'
};

function useCountUp(target) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const numericTarget = Number(target) || 0;
    const from = fromRef.current;
    const start = performance.now();
    const duration = 600;

    let frame;
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (numericTarget - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = numericTarget;
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function SummaryCard({ label, value, tone = 'default', loading = false }) {
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-3 w-20 rounded bg-[var(--border)]" />
        <div className="mt-3 h-7 w-14 rounded bg-[var(--border)]" />
      </div>
    );
  }

  return (
    <div className={`card ${tone} animate-popIn`}>
      <div className="flex items-center justify-between">
        <span className="card-label uppercase tracking-wide">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_COLOR[tone] || TONE_COLOR.default}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {TONE_ICON[tone] || TONE_ICON.default}
          </span>
        </span>
      </div>
      <div className="card-value tabular-nums">{isNumeric ? animated : value}</div>
    </div>
  );
}

export default SummaryCard;
