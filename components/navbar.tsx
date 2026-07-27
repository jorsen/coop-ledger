'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Settings, LogOut, LogIn, Menu, X, Moon, Sun, CalendarDays, Activity, DatabaseBackup, ChevronDown, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '@/components/theme-provider';

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, public: true  },
  { href: '/caretakers',   label: 'Caretakers',   icon: Users,           public: true  },
  { href: '/calendar',     label: 'Calendar',     icon: CalendarDays,    public: true  },
  { href: '/transactions', label: 'Transactions', icon: FileText,        public: false },
  { href: '/activity',     label: 'Activity',     icon: Activity,        public: false },
  { href: '/settings',     label: 'Settings',     icon: Settings,        public: false },
  { href: '/backup',       label: 'Backup',       icon: DatabaseBackup,  public: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: number; username: string }[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const loadSession = useCallback(async () => {
    const d = await (await fetch('/api/auth/session')).json();
    setIsLoggedIn(d.isLoggedIn);
    setUsername(d.username ?? null);
    setIsAdmin(d.isAdmin === true);
    setAdminUsername(d.adminUsername ?? null);
  }, []);

  useEffect(() => { loadSession(); }, [pathname, loadSession]);

  useEffect(() => {
    if (isAdmin) fetch('/api/users').then(r => r.json()).then(setAllUsers);
  }, [isAdmin]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  async function switchUser(userId: number) {
    await fetch('/api/admin/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setSwitcherOpen(false);
    await loadSession();
    router.refresh();
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 print:hidden">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 bg-green-800 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            FL
          </div>
          <span className="font-semibold text-green-800 dark:text-green-400 text-sm hidden lg:block">Feeds Ledger</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {NAV_LINKS.filter(l => isLoggedIn || l.public).map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-green-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right */}
        <div className="hidden lg:flex items-center gap-4 shrink-0 ml-auto">
          {isLoggedIn && isAdmin ? (
            <div className="relative">
              <button
                onClick={() => setSwitcherOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                Viewing as: <span className="font-medium text-gray-900 dark:text-white">{username}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {switcherOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-40">
                  {allUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => switchUser(u.id)}
                      className={clsx(
                        'flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                        u.username === username ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {u.username === adminUsername && <ShieldCheck className="w-3 h-3 shrink-0" />}
                      {u.username}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            isLoggedIn && username && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {username}
              </span>
            )
          )}
          <button
            onClick={toggle}
            className="flex items-center justify-center p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <LogIn className="w-4 h-4" />
              Login
            </Link>
          )}
        </div>

        {/* Mobile: active label + hamburger */}
        <span className="lg:hidden flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
          {NAV_LINKS.find(l => pathname.startsWith(l.href))?.label ?? 'Feeds Ledger'}
        </span>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="lg:hidden p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href="/login"
            className="lg:hidden p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Login"
          >
            <LogIn className="w-5 h-5" />
          </Link>
        )}
        <button
          className="lg:hidden p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
          {NAV_LINKS.filter(l => isLoggedIn || l.public).map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-green-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          {isLoggedIn && isAdmin && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="px-3 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-700 dark:text-green-400" /> Viewing as
              </p>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-sm',
                    u.username === username
                      ? 'text-green-700 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {u.username}
                </button>
              ))}
            </div>
          )}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={toggle}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            {isLoggedIn ? (
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
