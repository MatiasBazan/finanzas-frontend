'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/gastos',    label: 'Gastos' },
  { href: '/tarjetas',  label: 'Tarjetas' },
  { href: '/deudas',    label: 'Deudas' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login');
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex items-center gap-2 text-ink-mute text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
          <span>Cargando…</span>
        </div>
      </div>
    );
  }

  const displayName = user?.nombre ?? user?.email ?? 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  const currentLabel = NAV_ITEMS.find((n) => n.href === pathname)?.label ?? '';

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 flex flex-col bg-paper border-r border-rule transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex`}
      >
        {/* Wordmark — serif editorial */}
        <div className="h-16 flex items-center px-6 border-b border-rule">
          <Link href="/dashboard" className="flex items-baseline gap-1.5">
            <span className="serif text-[20px] font-medium tracking-tight text-ink leading-none">
              Finanzas
            </span>
            <span className="text-[11px] text-ink-faint tracking-wide leading-none">·AR</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center px-3.5 py-2 text-[13.5px] rounded-md transition-colors
                  ${active
                    ? 'text-ink font-medium bg-paper-deep'
                    : 'text-ink-soft hover:text-ink hover:bg-paper-deep/60'
                  }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-teal rounded-full" />
                )}
                <span className="ml-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User block */}
        <div className="border-t border-rule p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="h-7 w-7 rounded-full bg-teal text-paper flex items-center justify-center text-[12px] font-medium">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] text-ink truncate leading-tight">{displayName}</div>
              {user?.email && user.email !== displayName && (
                <div className="text-[11px] text-ink-mute truncate leading-tight">{user.email}</div>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 w-full text-left px-2 py-1.5 text-[12px] text-ink-mute hover:text-neg rounded-md transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — page title editorial */}
        <header className="h-16 flex items-center justify-between px-5 lg:px-8 border-b border-rule bg-paper">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-ink-mute hover:text-ink p-1 -ml-1"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className="serif text-[20px] font-medium tracking-tight text-ink leading-none">
              {currentLabel}
            </h1>
          </div>

        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
