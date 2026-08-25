import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const PAGE_SIZE = 15;

const STATUS_STYLE = {
  SENT: 'bg-emerald-500/15 text-emerald-500',
  FAILED: 'bg-red-500/15 text-red-500',
  DRY_RUN: 'bg-amber-500/15 text-amber-500'
};

function statusClass(status) {
  return STATUS_STYLE[status] || 'bg-accent/15 text-accent';
}

function ActivityLog() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  async function load() {
    const res = await api.get('/history');
    setRecords(res.data.records || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const statuses = useMemo(() => {
    const set = new Set(records.map((r) => r.status).filter(Boolean));
    return ['ALL', ...set];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = !search || String(r.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRecords = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <section>
      <h1>Activity Log</h1>
      <p className="muted">Live record of every send attempt, newest first.</p>

      <div className="panel">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" style={{ fontSize: 18 }}>
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email"
              className="!mt-0 !pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--text)]"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All statuses' : s}
              </option>
            ))}
          </select>

          <span className="text-xs text-[var(--muted)]">{filtered.length} record(s)</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--border)]" />
            ))}
          </div>
        ) : pageRecords.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">No matching records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Reason</th>
                  <th className="py-2 pr-4 font-medium">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((r, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/50">
                    <td className="py-2.5 pr-4 font-medium text-[var(--text)]">{r.email}</td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{r.emailtype || '-'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 max-w-xs truncate text-[var(--muted)]" title={r.reason}>
                      {r.reason || '-'}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-[var(--muted)]">
                      {r.sentat ? new Date(r.sentat).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              className="secondary !mt-0"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-[var(--muted)]">
              Page {page} of {totalPages}
            </span>
            <button
              className="secondary !mt-0"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default ActivityLog;
