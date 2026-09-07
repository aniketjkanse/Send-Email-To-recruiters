import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';
import FileDropzone from '../components/FileDropzone.jsx';
import { useToast } from '../ToastContext.jsx';
import { STATUS_META, useSchedulerStatusToast } from '../schedulerStatus.js';
import { staggerContainer, itemVariants } from '../motion.jsx';

function localDayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWeeklyData(records) {
  const todayKey = localDayKey(new Date());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    days.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      isToday: key === todayKey,
      count: 0
    });
  }
  const map = Object.fromEntries(days.map((d) => [d.key, d]));
  records.forEach((r) => {
    const sentAt = r.sentAt ?? r.sentat;
    if (r.status !== 'SENT' || !sentAt) return;
    const key = localDayKey(sentAt);
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

  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState('');

  const notify = useToast();
  useSchedulerStatusToast(status);

  async function load() {
    const [p, s, h, r, t] = await Promise.all([
      api.get('/preview'),
      api.get('/send/status'),
      api.get('/history'),
      api.get('/upload/resume/status'),
      api.get('/template/list')
    ]);
    setPreview(p.data);
    setStatus(s.data);
    setTemplates(t.data.templates || []);
    setActiveTemplateId(t.data.activeTemplateId || '');
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
  const activeTemplate = templates.find((t) => t.id === activeTemplateId);
  const maxCount = Math.max(1, ...weekly.map((d) => d.count));
  const weekTotal = weekly.reduce((sum, d) => sum + d.count, 0);
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
    <motion.section variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={itemVariants} className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1>
          {getGreeting()}
        </h1>

        <div className="card flex items-center gap-2 !p-2.5 !px-4">
          <span className="relative flex h-2.5 w-2.5">
            {isLive && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.color} opacity-75`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.color}`} />
          </span>
          <span className={`text-sm font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
      </motion.div>

      <motion.p variants={itemVariants} className="muted">
        Here's how your outreach is trending
        {totalAttempts > 0 && (
          <>
            {' '}— <span className="font-semibold text-[var(--text)]">{successRate}%</span> success rate all-time.
          </>
        )}
      </motion.p>

      <motion.div variants={staggerContainer} className="grid-cards">
        <SummaryCard label="Input" icon="inbox" value={preview?.totalInput ?? 0} loading={loading} />
        <SummaryCard label="New" icon="mark_email_unread" value={preview?.newEmails?.length ?? 0} tone="success" loading={loading} />
        <SummaryCard label="Sent" icon="mark_email_read" value={preview?.alreadySentEmails?.length ?? 0} tone="warning" loading={loading} />
        <SummaryCard label="Blocked" icon="block" value={preview?.blockedEmails?.length ?? 0} tone="danger" loading={loading} />
        <SummaryCard label="Invalid" icon="report" value={preview?.invalidEmails?.length ?? 0} tone="danger" loading={loading} />
        <SummaryCard label="Scheduler" icon="bolt" value={status?.status ?? 'IDLE'} loading={loading} />
      </motion.div>

      <motion.div variants={itemVariants} className="panel mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-semibold text-[var(--text)]">Quick Send</h2>

          <div className="flex items-center gap-2">
            <Link
              to="/template"
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

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4 text-sm">
          <span className="text-[var(--muted)]">Sending as</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600/10 px-2.5 py-1 font-semibold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {activeTemplate?.name || '—'}
          </span>
          {activeTemplate?.dryRun && (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
              dry run
            </span>
          )}
          <Link to="/template" className="text-xs font-semibold text-accent hover:underline">
            Edit
          </Link>
          <span className="ml-auto text-xs text-[var(--muted)]">Switch template from the top bar</span>
        </div>

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
          <Link to="/template" className="ml-auto font-semibold text-accent hover:underline">
            Edit
          </Link>
        </div>
      </motion.div>

      {isLive && status?.selected > 0 && (
        <motion.div variants={itemVariants} className="panel">
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
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="panel mt-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-base font-semibold text-[var(--text)]">Weekly Activity</h2>
          <span className="text-xs text-[var(--muted)]">
            {weekTotal} sent · last 7 days
          </span>
        </div>

        <div className="flex gap-3">
          {/* y-axis scale */}
          <div className="flex h-40 w-6 flex-col justify-between py-1 text-right text-[10px] text-[var(--muted)]">
            <span>{maxCount}</span>
            <span>{Math.round(maxCount / 2)}</span>
            <span>0</span>
          </div>

          {/* plot area */}
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <div className="border-t border-[var(--border)]" />
              <div className="border-t border-dashed border-[var(--border)] opacity-60" />
              <div className="border-t border-[var(--border)]" />
            </div>

            <div className="relative flex h-40 items-end justify-between gap-2">
              {weekly.map((day) => {
                const height = maxCount ? Math.round((day.count / maxCount) * 100) : 0;
                return (
                  <div
                    key={day.key}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <span
                      className={`mb-1 text-[11px] font-semibold transition-opacity ${
                        day.count ? 'text-[var(--text)]' : 'text-transparent'
                      }`}
                    >
                      {day.count}
                    </span>
                    <div
                      className={`w-full max-w-9 rounded-t-md transition-all duration-700 group-hover:brightness-125 group-hover:shadow-glow ${
                        day.isToday
                          ? 'bg-gradient-to-t from-accent-dark to-accent-light ring-2 ring-accent/40'
                          : 'bg-gradient-to-t from-accent to-accent-light'
                      }`}
                      style={{ height: `${Math.max(day.count ? 4 : 2, height)}%` }}
                      title={`${day.key} — ${day.count} sent`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between gap-2">
              {weekly.map((day) => (
                <span
                  key={day.key}
                  className={`flex-1 text-center text-[11px] font-medium ${
                    day.isToday ? 'text-accent' : 'text-[var(--muted)]'
                  }`}
                >
                  {day.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

export default Dashboard;
