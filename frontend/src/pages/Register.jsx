import {
  useState
} from 'react';

import {
  Link,
  Navigate,
  useNavigate
} from 'react-router-dom';

import {
  useAuth
} from '../context/AuthContext.jsx';

import './Auth.css';

function Register() {
  const {
    register,
    isAuthenticated
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    formData,
    setFormData
  ] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  async function submitRegistration(
    event
  ) {
    event.preventDefault();

    setError('');

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );

      return;
    }

    setLoading(true);

    try {
      await register({
        name:
          formData.name,
        email:
          formData.email,
        password:
          formData.password
      });

      navigate(
        '/',
        {
          replace: true
        }
      );
    } catch (
      registrationError
    ) {
      setError(
        registrationError.message
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
            Create Account
          </h1>

          <p>
            Create your private job
            outreach workspace.
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          onSubmit={
            submitRegistration
          }
        >
          <label className="auth-field">
            <span>
              Full Name
            </span>

            <input
              type="text"
              name="name"
              value={
                formData.name
              }
              onChange={
                updateField
              }
              placeholder="Your full name"
              autoComplete="name"
              required
            />
          </label>

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
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="auth-field">
            <span>
              Confirm Password
            </span>

            <input
              type="password"
              name="confirmPassword"
              value={
                formData.confirmPassword
              }
              onChange={
                updateField
              }
              placeholder="Enter password again"
              autoComplete="new-password"
              required
            />
          </label>

          <p className="password-note">
            Password must contain at
            least 8 characters, one
            letter, and one number.
          </p>

          <button
            type="submit"
            className="auth-primary-button"
            disabled={loading}
          >
            {loading
              ? 'Creating Account...'
              : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?
          {' '}

          <Link to="/login">
            Sign In
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register;