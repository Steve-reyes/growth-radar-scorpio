'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiPost, apiGet } from './api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (t: string) => {
    try {
      const u = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      }).then(r => r.json());
      setUser(u);
      setToken(t);
    } catch {
      localStorage.removeItem('gr_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('gr_token');
    if (stored) {
      fetchUser(stored);
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ access_token: string; user: User }>('/api/auth/login', { email, password });
    localStorage.setItem('gr_token', res.access_token);
    setUser(res.user);
    setToken(res.access_token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('gr_token');
    setUser(null);
    setToken(null);
    // Hard redirect to clear any cached page state
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
