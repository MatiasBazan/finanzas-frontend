'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'info' | 'success' | 'error' | 'warn';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  msg: string;
  tone: ToastTone;
  action?: ToastAction;
  duration: number;
}

interface ToastOptions {
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
}

interface ToastApi {
  show: (msg: string, opts?: ToastOptions) => void;
  success: (msg: string, opts?: Omit<ToastOptions, 'tone'>) => void;
  error: (msg: string, opts?: Omit<ToastOptions, 'tone'>) => void;
  warn: (msg: string, opts?: Omit<ToastOptions, 'tone'>) => void;
  info: (msg: string, opts?: Omit<ToastOptions, 'tone'>) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>(
    (msg, opts = {}) => {
      const id = nextId++;
      const item: ToastItem = {
        id,
        msg,
        tone: opts.tone ?? 'info',
        action: opts.action,
        duration: opts.duration ?? (opts.action ? 6000 : 3500),
      };
      setItems((prev) => [...prev, item]);
      if (item.duration > 0) {
        window.setTimeout(() => remove(id), item.duration);
      }
    },
    [remove]
  );

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m, o) => show(m, { ...o, tone: 'success' }),
    error: (m, o) => show(m, { ...o, tone: 'error', duration: o?.duration ?? 5000 }),
    warn: (m, o) => show(m, { ...o, tone: 'warn' }),
    info: (m, o) => show(m, { ...o, tone: 'info' }),
  }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-sm"
      >
        {items.map((t) => {
          const toneBorder =
            t.tone === 'success' ? 'border-pos' :
            t.tone === 'error'   ? 'border-neg' :
            t.tone === 'warn'    ? 'border-warn' :
            'border-teal';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 bg-paper-lifted border border-rule border-l-2 ${toneBorder} px-3.5 py-2.5 rounded-md lift text-[13px] animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <span className="text-ink-soft flex-1 leading-snug">{t.msg}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    remove(t.id);
                  }}
                  className="text-[12px] font-medium text-teal hover:text-ink shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-sm px-1"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                aria-label="Cerrar"
                className="text-ink-mute hover:text-ink shrink-0 leading-none text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 rounded-sm w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
