import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

const TONE_STYLE = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  error: 'border-red-500/30 bg-red-500/10 text-red-500',
  info: 'border-accent/30 bg-accent/10 text-accent'
};

const TONE_ICON = {
  success: 'check_circle',
  error: 'error',
  info: 'info'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex animate-popIn items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-glass backdrop-blur-xl ${TONE_STYLE[toast.tone] || TONE_STYLE.info} bg-[var(--panel)]`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {TONE_ICON[toast.tone] || TONE_ICON.info}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
