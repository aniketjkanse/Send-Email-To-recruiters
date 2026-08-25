import {
  useState
} from 'react';

import {
  Link,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';

import {
  useAuth
} from '../context/AuthContext.jsx';

import './Auth.css';

function Login() {
  const {
    login,
    isAuthenticated
  } = useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    formData,
    setFormData
  ] = useState({
    email: '',
    password: ''
  });

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    error,
    setError
  ] = useState('');

  if (isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  function updateField(
    event
  ) {
    const {
      name,
      value
    } = event.target;

    setFormData(current => ({
      ...current,
      [name]:
        value
    }));
  }

  async function submitLogin(
    event
  ) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      await login({
        email:
          formData.email,
        password:
          formData.password
      });

      const destination =
        location.state?.from ||
        '/';

      navigate(
        destination,
        {
          replace: true
        }
      );
    } catch (loginError) {
      setError(
        loginError.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <div className="auth-logo">
            JO
          </div>

          <h1>
            Welcome Back
          </h1>

          <p>
            Sign in to manage your
            outreach campaigns and
            follow-ups.
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          onSubmit={
            submitLogin
          }
        >
          <label className="auth-field">
            <span>
              Email Address
            </span>

            <input
              type="email"
              name="email"
              value={
                formData.email
              }
              onChange={
                updateField
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>
              Password
            </span>

            <input
              type="password"
              name="password"
              value={
                formData.password
              }
              onChange={
                updateField
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className="auth-primary-button"
            disabled={loading}
          >
            {loading
              ? 'Signing In...'
              : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Do not have an account?
          {' '}

          <Link to="/register">
            Create Account
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Login;