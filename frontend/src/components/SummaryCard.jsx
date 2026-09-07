import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { itemVariants, springHover } from '../motion.jsx';

const TONE_ICON = {
  default: 'inbox',
  success: 'mark_email_read',
  warning: 'schedule_send',
  danger: 'report'
};

/* solid icon / accent colour per tone */
const TONE_HEX = {
  default: 'var(--accent-solid)',
  success: 'var(--green)',
  warning: 'var(--yellow)',
  danger: 'var(--red)'
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

function IconBadge({ icon, hex }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ background: `color-mix(in srgb, ${hex} 15%, transparent)`, color: hex }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
        {icon}
      </span>
    </span>
  );
}

function SummaryCard({ label, value, tone = 'default', icon, loading = false, percent = null }) {
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);
  const hex = TONE_HEX[tone] || TONE_HEX.default;
  const iconName = icon || TONE_ICON[tone] || TONE_ICON.default;

  if (loading) {
    return (
      <div className="card stat-card">
        <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--border)]" />
        <div className="mt-3 h-6 w-12 animate-pulse rounded bg-[var(--border)]" />
        <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-[var(--border)]" />
      </div>
    );
  }

  const displayValue =
    percent !== null
      ? `${Math.round(percent)}%`
      : isNumeric
      ? animated
      : value;

  return (
    <motion.div variants={itemVariants} {...springHover} className="card stat-card">
      <IconBadge icon={iconName} hex={hex} />
      <div
        className="mt-3 truncate text-[24px] font-bold leading-none tracking-tight tabular-nums"
        style={{ color: isNumeric || percent !== null ? 'var(--heading)' : hex }}
        title={String(value)}
      >
        {displayValue}
      </div>
      <div className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
        {label}
      </div>
    </motion.div>
  );
}

export default SummaryCard;
