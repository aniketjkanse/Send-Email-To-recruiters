import { useEffect, useRef } from 'react';
import { useToast } from './ToastContext.jsx';

export const STATUS_META = {
  RUNNING: { label: 'Running', color: 'bg-emerald-500', text: 'text-emerald-500' },
  STOPPING: { label: 'Stopping', color: 'bg-amber-500', text: 'text-amber-500' },
  STOPPED: { label: 'Stopped', color: 'bg-slate-400', text: 'text-slate-400' },
  COMPLETED: { label: 'Completed', color: 'bg-accent', text: 'text-accent' },
  ERROR: { label: 'Error', color: 'bg-red-500', text: 'text-red-500' },
  IDLE: { label: 'Idle', color: 'bg-[var(--muted)]', text: 'text-[var(--muted)]' }
};

const TERMINAL_STATUSES = ['COMPLETED', 'STOPPED', 'ERROR'];
const ACTIVE_STATUSES = ['RUNNING', 'STOPPING'];

/*
 * Fires a toast the moment the scheduler moves from an active state
 * (RUNNING/STOPPING) into a terminal one (COMPLETED/STOPPED/ERROR), so
 * the customer sees a popup for a run finishing or erroring out even
 * if they never touched the Start/Stop buttons themselves.
 */
export function useSchedulerStatusToast(status) {
  const notify = useToast();
  const previousStatus = useRef(null);

  useEffect(() => {
    if (!status) return;

    const wasActive = ACTIVE_STATUSES.includes(previousStatus.current);
    const isTerminal = TERMINAL_STATUSES.includes(status.status);

    if (wasActive && isTerminal) {
      if (status.status === 'ERROR') {
        notify(status.message || 'Scheduler stopped due to an error', 'error');
      } else if (status.failed > 0 && status.sent === 0) {
        notify(status.message || 'Scheduler finished with failures', 'error');
      } else {
        notify(status.message || 'Scheduler finished', 'success');
      }
    }

    previousStatus.current = status.status;
  }, [status?.status, notify]);
}
