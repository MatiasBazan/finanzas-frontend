'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp } from 'lucide-react';

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
      setError('Credenciales incorrectas. Verificá tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/30">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Finanzas Personales
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Ingresá a tu cuenta</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400" htmlFor="password">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-blue-500/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
