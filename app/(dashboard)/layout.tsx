'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Receipt, CreditCard, Wallet, LogOut, Menu, TrendingUp } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { href: '/deudas', label: 'Deudas', icon: Wallet },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login');
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  const displayName = user?.nombre ?? user?.email ?? 'Usuario';

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-zinc-900 border-r border-zinc-800 transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-zinc-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Finanzas
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
                  ${active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-zinc-900 border-b border-zinc-800">
          <button
            className="lg:hidden p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-zinc-400">
              {displayName}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
