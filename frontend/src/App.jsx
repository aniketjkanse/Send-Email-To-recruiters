import {
  BrowserRouter,
  NavLink,
  Route,
  Routes
} from 'react-router-dom';

import Dashboard from './pages/Dashboard.jsx';
import UploadEmails from './pages/UploadEmails.jsx';
import Template from './pages/Template.jsx';
import Preview from './pages/Preview.jsx';
import Sender from './pages/Sender.jsx';
import SenderSettings from './pages/SenderSettings.jsx';
import FollowUps from './pages/FollowUps.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <h2>Job Outreach</h2>

          <p className="muted">
            Email Scheduler
          </p>

          <nav>
            <NavLink to="/">
              Dashboard
            </NavLink>

            <NavLink to="/upload">
              Upload
            </NavLink>

            <NavLink to="/template">
              Template
            </NavLink>

            <NavLink to="/preview">
              Preview
            </NavLink>

            <NavLink to="/send">
              Send
            </NavLink>

            <NavLink to="/followups">
              Follow-Ups
            </NavLink>

            <NavLink to="/settings">
              Sender Settings
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/upload"
              element={<UploadEmails />}
            />

            <Route
              path="/template"
              element={<Template />}
            />

            <Route
              path="/preview"
              element={<Preview />}
            />

            <Route
              path="/send"
              element={<Sender />}
            />

            <Route
              path="/followups"
              element={<FollowUps />}
            />

            <Route
              path="/settings"
              element={<SenderSettings />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;