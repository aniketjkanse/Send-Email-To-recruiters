import { useEffect, useState } from 'react';

function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  return saved === 'light' ? 'light' : 'dark';
}

function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const isLight = theme === 'light';

  function toggle(event) {
    const next = isLight ? 'dark' : 'light';
    const x = event.clientX;
    const y = event.clientY;
    const root = document.documentElement;
    root.style.setProperty('--ripple-x', `${x}px`);
    root.style.setProperty('--ripple-y', `${y}px`);

    if (document.startViewTransition) {
      root.classList.add('theme-animating');
      const transition = document.startViewTransition(() => setTheme(next));
      transition.finished.finally(() => root.classList.remove('theme-animating'));
    } else {
      setTheme(next);
    }
  }

  return (
    <button
      type="button"
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggle}
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] backdrop-blur-xl transition-all hover:border-accent hover:shadow-glow active:scale-95"
    >
      <span
        className="material-symbols-outlined transition-transform duration-500"
        style={{ transform: isLight ? 'rotate(0deg)' : 'rotate(180deg)' }}
      >
        {isLight ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}

export default ThemeToggle;
