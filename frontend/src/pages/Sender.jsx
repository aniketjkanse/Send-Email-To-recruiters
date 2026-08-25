import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../ToastContext.jsx';
import { useSchedulerStatusToast } from '../schedulerStatus.js';

const STATUS_META = {
  RUNNING: { label: 'Running', dot: 'bg-emerald-500', text: 'text-emerald-500' },
  STOPPING: { label: 'Stopping', dot: 'bg-amber-500', text: 'text-amber-500' },
  STOPPED: { label: 'Stopped', dot: 'bg-slate-400', text: 'text-slate-400' },
  COMPLETED: { label: 'Completed', dot: 'bg-accent', text: 'text-accent' },
  ERROR: { label: 'Error', dot: 'bg-red-500', text: 'text-red-500' },
  IDLE: { label: 'Idle', dot: 'bg-[var(--muted)]', text: 'text-[var(--muted)]' }
};

function Sender() {
  const [status, setStatus] = useState(null);
  const notify = useToast();
  useSchedulerStatusToast(status);

  async function load() {
    const response = await api.get('/send/status');
    setStatus(response.data);
  }

  async function start() {
    try {
      const response = await api.post('/send/start');
      notify(response.data.message, 'success');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to start scheduler', 'error');
    }
  }

  async function stop() {
    try {
      const response = await api.post('/send/stop');
      notify(response.data.message, 'info');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to stop scheduler', 'error');
    }
  }

  function downloadHistory() {
    window.open(`${api.defaults.baseURL}/history/download`, '_blank');
  }

  useEffect(() => {
    load();
    const intervalId = setInterval(load, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const isRunning = status?.status === 'RUNNING' || status?.status === 'STOPPING';
  const meta = STATUS_META[status?.status] || STATUS_META.IDLE;
  const totalDone = (status?.sent || 0) + (status?.failed || 0) + (status?.skipped || 0);
  const progressPct = status?.selected ? Math.min(100, (totalDone / status.selected) * 100) : 0;

  return (
    <section>
      <h1>Start Scheduled Sending</h1>

      <div className="panel">
        <p>
          This sends only new emails, skips duplicates, applies daily limit,
          and uses random delay configured in Template.
        </p>

        <button onClick={start} disabled={isRunning}>
          Start Scheduler
        </button>

        <button className="danger-button" onClick={stop} disabled={!isRunning}>
          Stop Scheduler
        </button>

        <button className="secondary" onClick={downloadHistory}>
          Download History
        </button>
      </div>

      {status && (
        <div className="panel animate-popIn">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="m-0 text-base font-semibold text-[var(--text)]">Scheduler Status</h3>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {isRunning && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-75`} />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`} />
              </span>
              <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
            </div>
          </div>

          {isRunning && status.selected > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--muted)]">
                <span>{totalDone} / {status.selected} processed</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatBlock label="Selected" value={status.selected} />
            <StatBlock label="Sent" value={status.sent} tone="text-emerald-500" />
            <StatBlock label="Failed" value={status.failed} tone="text-red-500" />
            <StatBlock label="Skipped / Dry Run" value={status.skipped} tone="text-amber-500" />
            <StatBlock label="Current" value={status.currentEmail || '-'} span />
          </div>

          {status.message && (
            <div className="notice mt-4 flex items-start gap-2 !bg-accent/10 !text-[var(--text)]">
              <span className="material-symbols-outlined shrink-0 text-accent" style={{ fontSize: 18 }}>
                info
              </span>
              {status.message}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatBlock({ label, value, tone = 'text-[var(--text)]', span = false }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg)]/40 p-3 ${span ? 'col-span-2 sm:col-span-3' : ''}`}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`mt-1 truncate text-lg font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

export default Sender;
