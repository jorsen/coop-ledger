'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import clsx from 'clsx';

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/caretakers',   label: 'Caretakers',   icon: Users },
  { href: '/transactions', label: 'Transactions', icon: FileText },
  { href: '/settings',     label: 'Settings',     icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => setIsLoggedIn(d.isLoggedIn));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 bg-green-800 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            FC
          </div>
          <span className="font-semibold text-green-800 text-sm hidden sm:block">Feed Cooperative</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active ? 'bg-green-800 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right */}
        {isLoggedIn && (
          <div className="hidden sm:flex items-center gap-4 shrink-0 ml-auto">
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              1 online
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {/* Mobile: active label + hamburger */}
        <span className="sm:hidden flex-1 text-sm font-medium text-gray-700">
          {NAV_LINKS.find(l => pathname.startsWith(l.href))?.label ?? 'Feed Cooperative'}
        </span>
        <button
          className="sm:hidden p-1.5 text-gray-600 hover:text-gray-900"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-green-800 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          {isLoggedIn && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
