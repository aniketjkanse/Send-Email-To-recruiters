import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import FileDropzone from '../components/FileDropzone.jsx';
import { useToast } from '../ToastContext.jsx';
import { STATUS_META, useSchedulerStatusToast } from '../schedulerStatus.js';

function buildWeeklyData(records) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      count: 0
    });
  }
  const map = Object.fromEntries(days.map((d) => [d.key, d]));
  records.forEach((r) => {
    if (r.status !== 'SENT' || !r.sentat) return;
    const key = String(r.sentat).slice(0, 10);
    if (map[key]) map[key].count += 1;
  });
  return days;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Dashboard() {
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [historyStats, setHistoryStats] = useState({ sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  const [emailsFile, setEmailsFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resumeStatus, setResumeStatus] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const notify = useToast();
  useSchedulerStatusToast(status);

  async function load() {
    const [p, s, h, r] = await Promise.all([
      api.get('/preview'),
      api.get('/send/status'),
      api.get('/history'),
      api.get('/upload/resume/status')
    ]);
    setPreview(p.data);
    setStatus(s.data);
    const records = h.data.records || [];
    setWeekly(buildWeeklyData(records));
    setHistoryStats({
      sent: records.filter((r) => r.status === 'SENT').length,
      failed: records.filter((r) => r.status === 'FAILED').length
    });
    setResumeStatus(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const intervalId = setInterval(load, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const meta = STATUS_META[status?.status] || STATUS_META.IDLE;
  const isLive = status?.status === 'RUNNING' || status?.status === 'STOPPING';
  const maxCount = Math.max(1, ...weekly.map((d) => d.count));
  const totalAttempts = historyStats.sent + historyStats.failed;
  const successRate = totalAttempts ? Math.round((historyStats.sent / totalAttempts) * 100) : 100;

  async function uploadEmailsFile() {
    if (!emailsFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('emailsFile', emailsFile);
      await api.post('/upload/emails', fd);

      const p = await api.get('/preview');
      setPreview(p.data);

      const newCount = p.data.newEmails?.length ?? 0;
      const oldCount = p.data.alreadySentEmails?.length ?? 0;
      setUploadResult({ newCount, oldCount, total: p.data.totalInput ?? 0 });

      notify(`Uploaded ${p.data.totalInput ?? 0} emails — ${newCount} new, ${oldCount} already sent`, 'success');
      setEmailsFile(null);
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to upload emails file', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function startScheduler() {
    try {
      const r = await api.post('/send/start');
      notify(r.data.message, 'success');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to start scheduler', 'error');
    }
  }

  async function stopScheduler() {
    try {
      const r = await api.post('/send/stop');
      notify(r.data.message, 'info');
      await load();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to stop scheduler', 'error');
    }
  }

  function downloadHistory() {
    window.open(`${api.defaults.baseURL}/history/download`, '_blank');
  }

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1>
          {getGreeting()}
        </h1>

        <div className="card flex items-center gap-2 !p-2.5 !px-4 shadow-glow">
          <span className="relative flex h-2.5 w-2.5">
            {isLive && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.color} opacity-75`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.color}`} />
          </span>
          <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
      </div>

      <p className="muted">
        Here's how your outreach is trending
        {totalAttempts > 0 && (
          <>
            {' '}— <span className="font-semibold text-[var(--text)]">{successRate}%</span> success rate all-time.
          </>
        )}
      </p>

      <div className="grid-cards">
        <SummaryCard label="Total Input" value={preview?.totalInput ?? 0} loading={loading} />
        <SummaryCard label="New Emails" value={preview?.newEmails?.length ?? 0} tone="success" loading={loading} />
        <SummaryCard label="Already Sent" value={preview?.alreadySentEmails?.length ?? 0} tone="warning" loading={loading} />
        <SummaryCard label="Blocked" value={preview?.blockedEmails?.length ?? 0} tone="danger" loading={loading} />
        <SummaryCard label="Invalid" value={preview?.invalidEmails?.length ?? 0} tone="danger" loading={loading} />
        <SummaryCard label="Scheduler" value={status?.status ?? 'IDLE'} loading={loading} />
      </div>

      <div className="panel mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-semibold text-[var(--text)]">Quick Send</h2>

          <div className="flex items-center gap-2">
            <Link
              to="/upload"
              title="Check / edit resume"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition-all hover:border-accent hover:text-accent"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                description
              </span>
            </Link>
            <Link
              to="/template"
              title="Edit email subject / body"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition-all hover:border-accent hover:text-accent"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                edit_note
              </span>
            </Link>
          </div>
        </div>

        <p className="muted !mt-0">
          This sends only new emails, skips duplicates, applies daily limit, and uses random delay
          configured in Template.
        </p>

        <FileDropzone
          id="dashboard-emails-file"
          accept=".txt,.csv"
          file={emailsFile}
          onChange={(e) => setEmailsFile(e.target.files[0])}
          placeholder="Click to choose an emails file"
          hint=".txt or .csv — one email per line"
        />

        {emailsFile && (
          <button className="btn-glow flex items-center gap-2" disabled={uploading} onClick={uploadEmailsFile}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
              {uploading ? 'progress_activity' : 'cloud_upload'}
            </span>
            {uploading ? 'Uploading...' : 'Upload Emails'}
          </button>
        )}

        {uploadResult && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-accent/5 px-4 py-3 text-sm animate-popIn">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>
              fact_check
            </span>
            <span>
              <span className="font-bold text-[var(--text)]">{uploadResult.total}</span> emails processed —{' '}
              <span className="font-semibold text-emerald-500">{uploadResult.newCount} new</span>,{' '}
              <span className="font-semibold text-amber-500">{uploadResult.oldCount} already sent</span>
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <button className="btn-glow flex items-center gap-2" onClick={startScheduler} disabled={isLive}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
              play_arrow
            </span>
            Start Scheduler
          </button>
          <button className="danger-button flex items-center gap-2" onClick={stopScheduler} disabled={!isLive}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
              stop
            </span>
            Stop Scheduler
          </button>
          <button className="secondary flex items-center gap-2" onClick={downloadHistory}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
              download
            </span>
            Download History
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
          <span className={`material-symbols-outlined ${resumeStatus?.uploaded ? 'text-emerald-500' : 'text-amber-500'}`} style={{ fontSize: 16 }}>
            {resumeStatus?.uploaded ? 'check_circle' : 'error'}
          </span>
          {resumeStatus?.uploaded ? (
            <>Resume attached: <span className="font-medium text-[var(--text)]">{resumeStatus.fileName}</span></>
          ) : (
            'No resume uploaded yet'
          )}
          <Link to="/upload" className="ml-auto font-semibold text-accent hover:underline">
            Edit
          </Link>
        </div>
      </div>

      {isLive && status?.selected > 0 && (
        <div className="panel animate-popIn">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--text)]">Send progress</span>
            <span className="text-[var(--muted)]">
              {status.sent + status.failed + status.skipped} / {status.selected}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark transition-all duration-700"
              style={{
                width: `${Math.min(100, ((status.sent + status.failed + status.skipped) / status.selected) * 100)}%`
              }}
            />
          </div>
          {status.currentEmail && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Currently sending: <span className="font-medium text-[var(--text)]">{status.currentEmail}</span>
            </p>
          )}
        </div>
      )}

      <div className="panel mt-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold text-[var(--text)]">Weekly Activity</h2>
          <span className="text-xs text-[var(--muted)]">Emails sent, last 7 days</span>
        </div>
        <div className="flex h-32 items-end justify-between gap-2">
          {weekly.map((day) => {
            const height = Math.max(6, Math.round((day.count / maxCount) * 100));
            return (
              <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full max-w-8 rounded-lg bg-gradient-to-t from-accent to-accent-light transition-all duration-700 hover:brightness-125 hover:shadow-glow"
                  style={{ height: `${height}%` }}
                  title={`${day.count} sent`}
                />
                <span className="text-[11px] font-medium text-[var(--muted)]">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
