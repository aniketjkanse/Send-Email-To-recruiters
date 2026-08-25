import {
  Navigate,
  useLocation
} from 'react-router-dom';

import {
  useAuth
} from '../context/AuthContext.jsx';

function ProtectedRoute({
  children
}) {
  const {
    loading,
    isAuthenticated
  } = useAuth();

  const location =
    useLocation();

  if (loading) {
    return (
      <div className="auth-loading">
        Checking login session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname
        }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;