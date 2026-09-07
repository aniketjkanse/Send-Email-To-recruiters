import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { EASE } from './motion.jsx';
import { api } from './services/api';
import Dashboard from './pages/Dashboard.jsx';
import Template from './pages/Template.jsx';
import Preview from './pages/Preview.jsx';
import Sender from './pages/Sender.jsx';
import SenderSettings from './pages/SenderSettings.jsx';
import FollowUps from './pages/FollowUps.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'grid_view', end: true },
  { to: '/template', label: 'Template', icon: 'description' },
  { to: '/preview', label: 'Preview', icon: 'visibility' },
  { to: '/send', label: 'Send', icon: 'send' },
  { to: '/followups', label: 'Follow-Ups', icon: 'forward_to_inbox' },
  { to: '/activity', label: 'Activity Log', icon: 'history' },
  { to: '/settings', label: 'Sender Settings', icon: 'settings' }
];

const TITLES = {
  '/': 'Dashboard',
  '/template': 'Email Template',
  '/preview': 'Preview',
  '/send': 'Send Emails',
  '/followups': 'Follow-Ups',
  '/activity': 'Activity Log',
  '/settings': 'Sender Settings'
};

function WorkspaceBadge() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [switchingTo, setSwitchingTo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setPickerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  async function load() {
    try {
      const r = await api.get('/template/list');
      setTemplates(r.data.templates || []);
      setActiveId(r.data.activeTemplateId || '');
    } catch (err) {
      /* ignore transient errors */
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const active = templates.find((t) => t.id === activeId);

  async function switchTo(id) {
    if (!id || id === activeId || switchingTo) return;

    const target = templates.find((t) => t.id === id);
    setSwitchingTo(target?.name || 'template');

    try {
      await api.post(`/template/${id}/activate`);
      /*
       * A template switch changes the whole workspace (history, list,
       * follow-ups). Hard reload so every page shows fresh data.
       */
      window.location.reload();
    } catch (err) {
      setSwitchingTo(null);
      setErrorMsg(
        err.response?.data?.message ||
          'Could not switch template. Please try again.'
      );
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)] md:inline">
        Mailing&nbsp;as
      </span>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={Boolean(switchingTo)}
        title="Switch mailing template"
        className="ws-trigger"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            active?.dryRun ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
        />
        <span className="max-w-[180px] truncate">{active?.name || 'Select template'}</span>
        <span className="material-symbols-outlined shrink-0 text-[var(--muted)]" style={{ fontSize: 18 }}>
          unfold_more
        </span>
      </button>

      {active?.dryRun && (
        <span className="rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">
          dry run
        </span>
      )}

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-lg)]"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div>
                  <h3 className="m-0 text-base font-bold text-[var(--heading)]">Mailing template</h3>
                  <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                    Each keeps its own list, history and follow-ups.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ padding: 4 }}
                  onClick={() => setPickerOpen(false)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    close
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-2 p-4">
                {templates.map((t) => {
                  const isActive = t.id === activeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={Boolean(switchingTo)}
                      onClick={() => {
                        setPickerOpen(false);
                        if (!isActive) switchTo(t.id);
                      }}
                      className={`ws-row${isActive ? ' ws-row--active' : ''}`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: isActive
                            ? 'var(--accent-solid)'
                            : 'color-mix(in srgb, var(--accent-solid) 12%, transparent)',
                          color: isActive ? '#fff' : 'var(--accent-solid)'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                          {isActive ? 'check' : 'mail'}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--heading)]">
                          {t.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                          {t.dailyLimit}/day · {t.hasResume ? 'resume attached' : 'no resume'}
                        </span>
                      </span>
                      {t.dryRun && (
                        <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                          dry
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[var(--border)] px-5 py-3">
                <button
                  type="button"
                  className="icon-btn text-xs font-semibold"
                  style={{ padding: '6px 8px', color: 'var(--accent-solid)' }}
                  onClick={() => {
                    setPickerOpen(false);
                    navigate('/template');
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    tune
                  </span>
                  &nbsp;Edit templates
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {switchingTo && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--bg)]/80 backdrop-blur-sm">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--border-strong)] border-t-[var(--accent-solid)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            Switching to {switchingTo}…
          </p>
        </div>
      )}

      {errorMsg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setErrorMsg('')}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 20 }}>
                warning
              </span>
              <h3 className="m-0 text-base font-semibold text-[var(--text)]">Can’t switch template</h3>
            </div>
            <p className="m-0 text-sm text-[var(--muted)]">{errorMsg}</p>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setErrorMsg('')}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Job Outreach';

  return (
    <header className="flex items-center justify-between gap-3 px-6 py-5 sm:px-8">
      <div className="min-w-0">
        <h1 className="m-0 truncate text-xl font-bold tracking-tight text-[var(--heading)] sm:text-2xl">{title}</h1>
        <p className="m-0 hidden text-xs text-[var(--muted)] sm:block">Recruiter outreach — automated, per template</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <WorkspaceBadge />
        <ThemeToggle />
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-3 py-2 backdrop-blur-xl lg:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
              isActive ? 'bg-accent/10 text-accent' : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`
          }
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={location.pathname}
        className="main-content flex-1"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/template" element={<Template />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/send" element={<Sender />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/settings" element={<SenderSettings />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="grid-bg" />

      <div className="flex min-h-screen gap-3 p-3 sm:gap-4 sm:p-4">
        <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-6 shadow-[var(--shadow-md)] lg:flex">
          <div className="mb-8 flex items-center gap-2.5 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-dark text-sm font-black text-white shadow-glow">
              JO
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-[var(--sidebar-text)]">Job Outreach</div>
              <div className="text-xs text-[var(--sidebar-muted)]">Email Scheduler</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className="block">
                {({ isActive }) => (
                  <motion.span
                    className={`nav-pill relative flex items-center gap-3 px-3 py-2.5 text-sm ${
                      isActive ? 'nav-pill-active' : ''
                    }`}
                    whileHover={{ x: isActive ? 0 : 3 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-bg"
                        className="absolute inset-0 rounded-xl bg-[var(--accent-tint)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span
                      className="material-symbols-outlined relative z-10"
                      style={{ fontSize: 20 }}
                    >
                      {item.icon}
                    </span>
                    <span className="relative z-10">{item.label}</span>
                  </motion.span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl bg-[var(--accent-tint)] px-4 py-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-solid-dark)]">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                bolt
              </span>
              Live &amp; automated
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
              Runs in the background with smart delays and duplicate protection.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-md)]">
          <TopBar />
          <MobileNav />
          <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
            <AnimatedRoutes />
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
