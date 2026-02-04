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

  // "loading" now means: session check is still running (NOT profile fetch).
  loading: boolean;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function withTimeout<T>(p: Promise<T>, ms = 2500): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Auth timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

const PROFILE_CACHE_KEY = '__pbx_profile_cache_v1__';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readProfileCache(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; userId: string; profile: Profile };
    if (!parsed?.ts || !parsed?.userId || !parsed?.profile) return null;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > PROFILE_CACHE_TTL_MS) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

function writeProfileCache(userId: string, profile: Profile) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ts: Date.now(), userId, profile }));
  } catch {
    // ignore
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef<string>('/');

  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);

  // Only blocks while checking session (fast). [page:2]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pathnameRef.current = pathname || '/';
  }, [pathname]);

  const loadUserProfile = async (userId: string) => {
    // 1) Instant UI from cache (optional)
    const cached = readProfileCache(userId);
    if (cached) setUser(cached);

    // 2) Real profile fetch (network) in background
    const { data, error } = await supabase
      .from('profiles')
      // Fetch only what you actually need (smaller payload = faster)
      .select('id,email,full_name,phone,role,approval_status,avatar_url,logo_url,profile_completed,is_active,updated_at,created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile fetch error:', error.message);
      return;
    }

    const profile = (data as Profile) ?? null;
    setUser(profile);

    if (profile?.id) writeProfileCache(profile.id, profile);
  };

  const initAuth = async () => {
    // getSession reads from client storage attached to the Supabase client. [page:2]
    const res = await withTimeout(supabase.auth.getSession(), 2500); // [page:2]
    const u = res.data.session?.user ?? null;

    setAuthUser(u);

    // IMPORTANT: stop blocking UI as soon as we know session status
    setLoading(false);

    if (u?.id) {
      // profile load should not block UI
      loadUserProfile(u.id).catch((e) => console.error('loadUserProfile error:', e?.message || String(e)));
    } else {
      setUser(null);
      try {
        localStorage.removeItem(PROFILE_CACHE_KEY);
      } catch {}
    }
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
        setLoading(false);
      }
    };

    run();

    // Listen to auth events. [page:2]
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (!alive) return;

      if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setUser(null);
        setLoading(false);

        try {
          localStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {}

        const p = pathnameRef.current || '/';
        const isPublic = p === '/' || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/auth/');
        if (!isPublic) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
        else router.replace('/');

        return;
      }

      const u = session?.user ?? null;
      setAuthUser(u);
      setLoading(false);

      if (u?.id) {
        loadUserProfile(u.id).catch((e) => console.error('loadUserProfile error:', e?.message || String(e)));
      } else {
        setUser(null);
      }
    }); // [page:2]

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const refreshUser = async () => {
    // Don’t block UI long; just refresh session quickly then refresh profile async. [page:2]
    try {
      const res = await withTimeout(supabase.auth.getSession(), 2500); // [page:2]
      const u = res.data.session?.user ?? null;
      setAuthUser(u);

      if (u?.id) loadUserProfile(u.id).catch(() => {});
      else setUser(null);
    } catch (e: any) {
      console.error('refreshUser error:', e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Optimistic UI: update state immediately, then call signOut
    setAuthUser(null);
    setUser(null);
    setLoading(false);

    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {}

    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Logout error:', error.message);
    } finally {
      router.replace('/');
      router.refresh();
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
