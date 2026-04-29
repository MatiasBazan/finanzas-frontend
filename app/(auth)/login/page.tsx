'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('No pudimos iniciar sesión. Revisá tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'h-10 bg-paper-deep border border-edge rounded-md text-ink placeholder:text-ink-faint text-[14px] px-3 focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal/15 font-mono';

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Top wordmark */}
      <header className="h-16 border-b border-rule flex items-center px-6 lg:px-8">
        <Link href="/login" className="flex items-baseline gap-1.5">
          <span className="serif text-[20px] font-medium tracking-tight text-ink leading-none">
            Finanzas
          </span>
          <span className="text-[11px] text-ink-faint tracking-wide leading-none">·AR</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <p className="eyebrow">Acceso</p>
          <h1 className="serif text-[28px] font-medium text-ink mt-1.5 tracking-tight leading-tight">
            Iniciá sesión
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-mute">
            Ingresá tu email y contraseña para continuar.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputCls}
              />
            </Field>

            <Field label="Contraseña">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </Field>

            {error && (
              <div className="px-3 py-2.5 bg-neg-bg border-l-2 border-neg rounded-r-sm">
                <span className="text-[12.5px] text-neg">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-[13.5px] font-medium bg-teal text-paper hover:bg-ink rounded-md disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-paper animate-pulse" />
                  <span>Ingresando…</span>
                </>
              ) : (
                <span>Ingresar</span>
              )}
            </button>
          </form>

          <p className="mt-6 pt-5 border-t border-rule text-[13px] text-ink-mute">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-teal hover:underline underline-offset-2">
              Creá una cuenta
            </Link>
          </p>
        </div>
      </div>

      <footer className="border-t border-rule px-6 lg:px-8 py-4 text-[11.5px] text-ink-faint flex items-center justify-between">
        <span>Finanzas · gestión personal</span>
        <span className="hidden sm:inline">ARS / USD</span>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] text-ink-soft font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
