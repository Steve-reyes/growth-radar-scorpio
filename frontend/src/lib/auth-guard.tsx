'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './auth-context';

const PUBLIC_PATHS = ['/login', '/leads-imported'];
const PUBLIC_PREFIXES: string[] = []; // match pathname starts-with

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = (p: string): boolean =>
    PUBLIC_PATHS.includes(p) || PUBLIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isPublicPath(pathname)) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Show nothing while checking auth (prevents flash of protected content)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="text-[#64748B] text-sm">Loading...</div>
      </div>
    );
  }

  // If on a public path or authenticated, render children
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
