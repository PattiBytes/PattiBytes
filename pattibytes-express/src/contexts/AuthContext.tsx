/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { User as SupabaseUser, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export interface Profile {
  user_metadata?: any;
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  approval_status?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  addresses?: any[];
  profile_completed?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuthContextType {
  user: Profile | null;
  authUser: SupabaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ✅ Export it (this fixes your build error)
export const AuthContext = createContext<AuthContextType | null>(null);

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Auth timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef<string>('/');

  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pathnameRef.current = pathname || '/';
  }, [pathname]);

  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.error('Profile fetch error:', error.message);
      setUser(null);
      return;
    }
    setUser((data as Profile) ?? null);
  };

  const initAuth = async () => {
    const res = await withTimeout(supabase.auth.getSession(), 8000);
    const u = res.data.session?.user ?? null;
    setAuthUser(u);
    if (u?.id) await loadUserProfile(u.id);
    else setUser(null);
  };

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      try {
        await initAuth();
      } catch (e: any) {
        console.error('Auth init error:', e?.message || String(e));
        setAuthUser(null);
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (!alive) return;

      if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setUser(null);

        const p = pathnameRef.current || '/';
        const isPublic = p === '/' || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/auth/');

        if (!isPublic) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
        else router.replace('/');

        return;
      }

      const u = session?.user ?? null;
      setAuthUser(u);
      if (u?.id) await loadUserProfile(u.id);
      else setUser(null);
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const refreshUser = async () => {
    setLoading(true);
    try {
      await initAuth();
    } catch (e: any) {
      console.error('refreshUser error:', e?.message || String(e));
      setAuthUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Logout error:', error.message);

      setAuthUser(null);
      setUser(null);

      router.replace('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({ user, authUser, loading, logout, refreshUser }), [user, authUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
