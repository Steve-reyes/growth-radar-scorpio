'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Dashboard', href: '/' },
  { name: 'Territories', href: '/territories' },
  { name: 'Leads', href: '/leads' },
  { name: 'Daily Brief', href: '/briefs' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="site-header sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[#007AFF]">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M14 6 L14 14 L20 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">
              Growth Radar
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href ||
                (tab.href !== '/' && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    relative px-3 sm:px-4 py-2 text-sm font-semibold rounded-full transition-all duration-150
                    ${isActive
                      ? 'text-white bg-[#007AFF] shadow-sm'
                      : 'text-[#3A3A3C] dark:text-[#C7C7CC] hover:text-[#1C1C1E] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }
                  `}
                >
                  {tab.name}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-[#007AFF] -z-10" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
