import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';

import Dashboard from './pages/Dashboard.jsx';
import UploadEmails from './pages/UploadEmails.jsx';
import Template from './pages/Template.jsx';
import Preview from './pages/Preview.jsx';
import Sender from './pages/Sender.jsx';
import SenderSettings from './pages/SenderSettings.jsx';
import FollowUps from './pages/FollowUps.jsx';
import ActivityLog from './pages/ActivityLog.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'grid_view', end: true },
  { to: '/upload', label: 'Upload', icon: 'upload_file' },
  { to: '/template', label: 'Template', icon: 'description' },
  { to: '/preview', label: 'Preview', icon: 'visibility' },
  { to: '/send', label: 'Send', icon: 'send' },
  { to: '/followups', label: 'Follow-Ups', icon: 'forward_to_inbox' },
  { to: '/activity', label: 'Activity Log', icon: 'history' },
  { to: '/settings', label: 'Sender Settings', icon: 'settings' }
];

const TITLES = {
  '/': 'Dashboard',
  '/upload': 'Upload Emails',
  '/template': 'Email Template',
  '/preview': 'Preview',
  '/send': 'Send Emails',
  '/followups': 'Follow-Ups',
  '/activity': 'Activity Log',
  '/settings': 'Sender Settings'
};

function TopBar() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Job Outreach';

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 px-6 py-4 backdrop-blur-xl sm:px-8">
      <div>
        <h1 className="m-0 text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">{title}</h1>
        <p className="m-0 text-xs text-[var(--muted)]">Enterprise-style file-based recruiter email scheduler</p>
      </div>
      <ThemeToggle />
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
    <main key={location.pathname} className="main-content flex-1 animate-fadeIn">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadEmails />} />
        <Route path="/template" element={<Template />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="/send" element={<Sender />} />
        <Route path="/followups" element={<FollowUps />} />
        <Route path="/activity" element={<ActivityLog />} />
        <Route path="/settings" element={<SenderSettings />} />
      </Routes>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="hero-glow hero-glow-1" />
      <div className="hero-glow hero-glow-2" />
      <div className="grid-bg" />

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-6 backdrop-blur-xl lg:flex">
          <div className="mb-8 flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark text-sm font-black text-white shadow-glow">
              JO
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-[var(--sidebar-text)]">Job Outreach</div>
              <div className="text-xs text-[var(--sidebar-muted)]">Email Scheduler</div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `nav-pill flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                    isActive ? 'nav-pill-active' : 'text-[var(--sidebar-text)] hover:bg-[var(--border)]'
                  }`
                }
              >
                <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-gradient-to-br from-accent/10 to-accent-dark/5 px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                bolt
              </span>
              Live &amp; automated
            </div>
            <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
              Scheduler runs safely in the background with smart delays and duplicate protection.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <MobileNav />
          <AnimatedRoutes />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
