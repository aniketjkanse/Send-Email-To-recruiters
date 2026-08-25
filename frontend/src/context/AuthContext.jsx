import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const API_BASE_URL =
  'http://localhost:5000/api';

const TOKEN_STORAGE_KEY =
  'job_outreach_token';

const AuthContext =
  createContext(null);

function AuthProvider({
  children
}) {
  const [
    token,
    setToken
  ] = useState(() => {
    return localStorage.getItem(
      TOKEN_STORAGE_KEY
    );
  });

  const [
    user,
    setUser
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  function saveAuthentication(
    authenticationToken,
    authenticatedUser
  ) {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      authenticationToken
    );

    setToken(
      authenticationToken
    );

    setUser(
      authenticatedUser
    );
  }

  function logout() {
    localStorage.removeItem(
      TOKEN_STORAGE_KEY
    );

    setToken(null);
    setUser(null);
  }

  async function loadCurrentUser(
    authenticationToken
  ) {
    const response = await fetch(
      `${API_BASE_URL}/auth/me`,
      {
        headers: {
          Authorization:
            `Bearer ${authenticationToken}`
        }
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        'Unable to load current user.'
      );
    }

    setUser(
      result.user
    );

    return result.user;
  }

  async function login({
    email,
    password
  }) {
    const response = await fetch(
      `${API_BASE_URL}/auth/login`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        'Login failed.'
      );
    }

    saveAuthentication(
      result.token,
      result.user
    );

    return result.user;
  }

  async function register({
    name,
    email,
    password
  }) {
    const response = await fetch(
      `${API_BASE_URL}/auth/register`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        'Registration failed.'
      );
    }

    saveAuthentication(
      result.token,
      result.user
    );

    return result.user;
  }

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await loadCurrentUser(
          token
        );
      } catch (error) {
        console.log(
          'Existing login session is invalid:',
          error.message
        );

        logout();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [token]);

  const contextValue =
    useMemo(
      () => ({
        token,
        user,
        loading,
        isAuthenticated:
          Boolean(
            token &&
            user
          ),
        login,
        register,
        logout
      }),
      [
        token,
        user,
        loading
      ]
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider.'
    );
  }

  return context;
}

export {
  AuthProvider,
  useAuth,
  API_BASE_URL,
  TOKEN_STORAGE_KEY
};