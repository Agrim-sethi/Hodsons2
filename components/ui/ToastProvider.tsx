import React from 'react';
import { Icon } from '../Icon';

type ToastVariant = 'success';

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismissToast = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = React.useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const duration = toast.duration ?? 2600;

    setToasts((current) => [...current.slice(-2), { ...toast, id, variant: toast.variant ?? 'success' }]);

    window.setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(92vw,26rem)] flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <div key={toast.id} className="royal-toast pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-300">
            <div className="royal-toast-icon">
              <Icon name="check_circle" size="18" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#fff4d2]">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-slate-400 transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <Icon name="close" size="16" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
