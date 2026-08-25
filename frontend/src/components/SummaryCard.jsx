import { useEffect, useRef, useState } from 'react';

const TONE_ICON = {
  default: 'analytics',
  success: 'check_circle',
  warning: 'schedule',
  danger: 'error'
};

const TONE_RING = {
  default: '#6C5CE7',
  success: '#22c55e',
  warning: '#f97316',
  danger: '#ef4444'
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

function ProgressRing({ percent, color }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .7s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--text)]">
        {Math.round(percent)}%
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = 'default', loading = false, percent = null }) {
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-[var(--border)]" />
          <div className="flex-1">
            <div className="h-6 w-16 rounded bg-[var(--border)]" />
            <div className="mt-2 h-3 w-20 rounded bg-[var(--border)]" />
          </div>
        </div>
      </div>
    );
  }

  if (percent !== null) {
    return (
      <div className="card animate-popIn flex items-center gap-4">
        <ProgressRing percent={percent} color={TONE_RING[tone] || TONE_RING.default} />
        <div className="min-w-0">
          <div className="card-value tabular-nums !mt-0 truncate">{isNumeric ? animated : value}</div>
          <div className="card-label uppercase tracking-wide">{label}</div>
        </div>
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

      {isNumeric ? (
        <div className="card-value tabular-nums">{animated}</div>
      ) : (
        <div className="mt-2">
          <span
            className={`inline-block max-w-full truncate rounded-full px-3 py-1 text-sm font-bold ${TONE_COLOR[tone] || TONE_COLOR.default}`}
            title={String(value)}
          >
            {value}
          </span>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
