'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    name: 'Territories',
    href: '/territories',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2 L13 7 L18 8 L14.5 12 L15 18 L10 15.5 L5 18 L5.5 12 L2 8 L7 7 L10 2Z" />
      </svg>
    ),
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 6a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M17 17c0-2.21-3.13-4-7-4s-7 1.79-7 4" />
      </svg>
    ),
  },

  {
    name: 'Kanban',
    href: '/kanban',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="4" height="14" rx="1" />
        <rect x="8" y="3" width="4" height="11" rx="1" />
        <rect x="14" y="3" width="4" height="8" rx="1" />
      </svg>
    ),
  },
  {
    name: 'Daily Brief',
    href: '/briefs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2h10a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M7 6h6M7 9h6M7 12h4" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="2.5" />
        <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.95 4.05l-1.41 1.41M5.46 14.54l-1.41 1.41M15.95 15.95l-1.41-1.41M5.46 5.46L4.05 4.05" />
      </svg>
    ),
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Don't show sidebar on login page
  if (pathname === '/login') return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0B0D14] border-r border-[rgba(148,163,184,0.08)] z-40 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[rgba(148,163,184,0.06)]">
        <Link href="/" className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="#10B981" strokeWidth="2" fill="none" />
            <path d="M14 6 L14 14 L20 14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold tracking-tight gradient-text">
            Growth Radar
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems
          .filter((item) => item.name !== 'Settings' || user?.role === 'admin')
          .map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? 'sidebar-link-active' : ''} pl-[16px]`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Docs Link */}
      <div className="px-3 mb-2">
        <Link
          href="/docs"
          className={`sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/docs'
              ? 'sidebar-link-active text-[#F1F5F9]'
              : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-[rgba(148,163,184,0.04)]'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="8" />
            <path d="M10 7v4M10 14v.01" />
          </svg>
          <span>Docs</span>
        </Link>
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-[rgba(148,163,184,0.06)]">
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 group cursor-pointer transition-all hover:bg-[rgba(148,163,184,0.04)] rounded-lg p-2 -mx-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[rgba(16,185,129,0.2)]">
                <span className="text-xs font-bold text-white">
                  {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F1F5F9] truncate">{user.name}</p>
                <p className="text-xs text-[#64748B] truncate group-hover:text-[#94A3B8] transition-colors">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left text-xs text-[#64748B] hover:text-[#EF4444] transition-colors px-2 py-1 rounded hover:bg-[rgba(239,68,68,0.06)]"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 8l4 4-4 4" />
              <path d="M9 12h10" />
              <path d="M12 2H3a1 1 0 00-1 1v14a1 1 0 001 1h9" />
            </svg>
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
