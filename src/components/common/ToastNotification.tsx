import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col space-y-2 pointer-events-none"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const styleConfig = {
    success: {
      bg: 'bg-emerald-900/95 text-emerald-50 border-emerald-500/50 shadow-emerald-950/20',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />,
      accent: 'text-emerald-200',
    },
    info: {
      bg: 'bg-slate-900/95 text-slate-50 border-teal-500/50 shadow-slate-950/20',
      icon: <Sparkles className="w-5 h-5 text-teal-300 shrink-0" />,
      accent: 'text-teal-200',
    },
    warning: {
      bg: 'bg-amber-950/95 text-amber-50 border-amber-500/50 shadow-amber-950/20',
      icon: <AlertCircle className="w-5 h-5 text-amber-300 shrink-0" />,
      accent: 'text-amber-200',
    },
    error: {
      bg: 'bg-rose-950/95 text-rose-50 border-rose-500/50 shadow-rose-950/20',
      icon: <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />,
      accent: 'text-rose-200',
    },
  }[toast.type];

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start justify-between p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${styleConfig.bg}`}
    >
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">{styleConfig.icon}</div>
        <div>
          <div className="font-bold text-sm tracking-tight">{toast.title}</div>
          {toast.message && (
            <div className={`text-xs mt-0.5 ${styleConfig.accent}`}>{toast.message}</div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 -mr-1 -mt-1 text-white/60 hover:text-white rounded-lg transition-colors"
        aria-label="Chiudi notifica"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
