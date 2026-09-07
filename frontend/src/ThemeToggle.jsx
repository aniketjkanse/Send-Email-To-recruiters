import { useEffect, useState } from 'react';

function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  return saved === 'dark' ? 'dark' : 'light';
}

function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const isLight = theme === 'light';

  function toggle() {
    setTheme(isLight ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggle}
      className="theme-toggle-btn"
    >
      <span
        className="material-symbols-outlined"
        style={{ transform: isLight ? 'rotate(0deg)' : 'rotate(180deg)', color: 'var(--text)' }}
      >
        {isLight ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}

export default ThemeToggle;
