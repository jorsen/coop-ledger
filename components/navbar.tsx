'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Wheat, LogOut } from 'lucide-react';
import clsx from 'clsx';

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/clients',      label: 'Clients',      icon: Users },
  { href: '/transactions', label: 'Transactions', icon: FileText },
  { href: '/feeds',        label: 'Feeds',        icon: Wheat },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-green-800 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            FC
          </div>
          <span className="font-semibold text-green-800 text-sm">Feed Cooperative</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-green-800 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            1 online
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
