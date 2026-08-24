import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth
} from './context/AuthContext.jsx';

import ProtectedRoute from
  './components/ProtectedRoute.jsx';

import Dashboard from
  './pages/Dashboard.jsx';

import History from
  './pages/History.jsx';

import UploadEmails from
  './pages/UploadEmails.jsx';

import Template from
  './pages/Template.jsx';

import Preview from
  './pages/Preview.jsx';

import Sender from
  './pages/Sender.jsx';

import SenderSettings from
  './pages/SenderSettings.jsx';

import FollowUps from
  './pages/FollowUps.jsx';

import Login from
  './pages/Login.jsx';

import Register from
  './pages/Register.jsx';

function ApplicationLayout() {
  const {
    user,
    logout
  } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>
            Job Outreach
          </h2>

          <p className="muted">
            Email Scheduler
          </p>
        </div>

        <nav>
          <NavLink
            to="/"
            end
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/history"
          >
            History
          </NavLink>

          <NavLink
            to="/upload"
          >
            Upload
          </NavLink>

          <NavLink
            to="/template"
          >
            Template
          </NavLink>

          <NavLink
            to="/preview"
          >
            Preview
          </NavLink>

          <NavLink
            to="/send"
          >
            Send
          </NavLink>

          <NavLink
            to="/followups"
          >
            Follow-Ups
          </NavLink>

          <NavLink
            to="/settings"
          >
            Sender Settings
          </NavLink>
        </nav>

        <div className="user-panel">
          <strong>
            {user?.name ||
              'User'}
          </strong>

          <span>
            {user?.email ||
              ''}
          </span>

          <button
            type="button"
            className="logout-button"
            onClick={
              logout
            }
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard />
            }
          />

          <Route
            path="/history"
            element={
              <History />
            }
          />

          <Route
            path="/upload"
            element={
              <UploadEmails />
            }
          />

          <Route
            path="/template"
            element={
              <Template />
            }
          />

          <Route
            path="/preview"
            element={
              <Preview />
            }
          />

          <Route
            path="/send"
            element={
              <Sender />
            }
          />

          <Route
            path="/followups"
            element={
              <FollowUps />
            }
          />

          <Route
            path="/settings"
            element={
              <SenderSettings />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedApplication() {
  return (
    <ProtectedRoute>
      <ApplicationLayout />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <Login />
            }
          />

          <Route
            path="/register"
            element={
              <Register />
            }
          />

          <Route
            path="/*"
            element={
              <ProtectedApplication />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;