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
  loading: boolean; // true only while restoring initial session
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const PROFILE_CACHE_KEY = '__pbx_profile_cache_v1__';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readProfileCache(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; userId: string; profile: Profile };
    if (!parsed?.ts || parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > PROFILE_CACHE_TTL_MS) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

function writeProfileCache(userId: string, profile: Profile) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ts: Date.now(), userId, profile }));
  } catch {}
}

function clearProfileCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef<string>('/');

  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const initialHandledRef = useRef(false);
  const profileReqRef = useRef(0);

  useEffect(() => {
    pathnameRef.current = pathname || '/';
  }, [pathname]);

  const loadUserProfile = async (userId: string) => {
    const cached = readProfileCache(userId);
    if (cached) setUser(cached);

    const reqId = ++profileReqRef.current;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,approval_status,avatar_url,logo_url,profile_completed,is_active,updated_at,created_at')
      .eq('id', userId)
      .maybeSingle();

    if (reqId !== profileReqRef.current) return;

    if (error) {
      console.error('Profile fetch error:', error.message);
      return;
    }

    const profile = (data as Profile) ?? null;
    setUser(profile);
    if (profile?.id) writeProfileCache(profile.id, profile);
  };

  const applySession = async (session: any) => {
    const u = session?.user ?? null;
    setAuthUser(u);

    if (u?.id) {
      loadUserProfile(u.id).catch((e) => console.error('loadUserProfile error:', e?.message || String(e)));
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    let alive = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (!alive) return;

      // IMPORTANT: don’t redirect until initial session is known
      if (event === 'INITIAL_SESSION') {
        initialHandledRef.current = true;
        await applySession(session);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setUser(null);
        clearProfileCache();
        setLoading(false);

        const p = pathnameRef.current || '/';
        const isPublic = p === '/' || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/auth/');

        if (!isPublic) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
        else router.replace('/');

        return;
      }

      // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED...
      await applySession(session);
    });

    // Fallback: if INITIAL_SESSION doesn’t arrive quickly, getSession once
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        if (!initialHandledRef.current) {
          initialHandledRef.current = true;
          await applySession(data.session);
          setLoading(false);
        }
      } catch (e: any) {
        console.error('getSession error:', e?.message || String(e));
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Optional: on resume, calling getSession can refresh an expired access token.
  useEffect(() => {
    const onResume = async () => {
      try {
        await supabase.auth.getSession();
      } catch {}
    };

    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onResume();
    });

    return () => window.removeEventListener('focus', onResume);
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await applySession(data.session);
    } catch (e: any) {
      console.error('refreshUser error:', e?.message || String(e));
    }
  };

  const logout = async () => {
    // Optimistic UI
    setAuthUser(null);
    setUser(null);
    setLoading(false);
    clearProfileCache();

    try {
      await supabase.auth.signOut();
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
