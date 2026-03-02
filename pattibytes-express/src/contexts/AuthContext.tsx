/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
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

  account_status?: string | null;
  is_approved?: boolean | null;
}

export interface AuthContextType {
  user: Profile | null; // profile row (app user)
  authUser: SupabaseUser | null; // supabase auth user
  loading: boolean; // initial boot only
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
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

function isPublicPath(p: string) {
  return p === '/' || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/auth/');
}

// Keep this aligned with your table columns
const PROFILE_SELECT =
  'id,email,full_name,phone,role,approval_status,avatar_url,profile_completed,is_active,created_at,updated_at,account_status,is_approved';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef<string>('/');

  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [booting, setBooting] = useState(true);

  // Keep freshest profile in a ref to avoid stale closures
  const userRef = useRef<Profile | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // request/race guards
  const reqIdRef = useRef(0);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const inflightProfileRef = useRef<Promise<Profile | null> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname || '/';
  }, [pathname]);

  const loadUserProfile = useCallback(async (userId: string, opts?: { force?: boolean }) => {
    if (!userId) return null;

    if (!opts?.force && lastProfileUserIdRef.current === userId) {
      return userRef.current; // safe cached return
    }
    if (inflightProfileRef.current) return inflightProfileRef.current;

    const rid = ++reqIdRef.current;

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('id', userId)
          .maybeSingle();

        if (rid !== reqIdRef.current) return null;

        if (error) {
          console.error('Profile fetch error:', error.message);
          setUser(null);
          lastProfileUserIdRef.current = null;
          return null;
        }

        const row = (data as Profile) ?? null;
        setUser(row);
        lastProfileUserIdRef.current = row?.id ?? null;
        return row;
      } finally {
        inflightProfileRef.current = null;
      }
    })();

    inflightProfileRef.current = promise;
    return promise;
  }, []);

  /**
   * Ensures there is a `profiles` row for the given auth user.
   * Needed for Google One Tap / signInWithIdToken (no /auth/callback step to create profile).
   */
  const ensureProfile = useCallback(async (u: SupabaseUser) => {
    const { data: existing, error: e1 } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', u.id)
      .maybeSingle();

    if (e1) throw e1;
    if (existing) return existing as Profile;

    const payload = {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
      phone: u.phone || u.user_metadata?.phone || '',
      role: 'customer',
      approval_status: 'approved',
      profile_completed: true,
      is_active: true,
      avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || '',
    };

    const { data: created, error: e2 } = await supabase
      .from('profiles')
      .insert([payload])
      .select(PROFILE_SELECT)
      .single();

    if (e2) {
      // If insert fails due to RLS, you must add an INSERT policy on profiles.
      throw e2;
    }
    return created as Profile;
  }, []);

  const hydrateFromSession = useCallback(
    async (sessionUser: SupabaseUser | null) => {
      setAuthUser((prev) => (prev?.id === sessionUser?.id ? prev : sessionUser));

      if (sessionUser?.id) {
        try {
          await ensureProfile(sessionUser);
        } catch (e: any) {
          // Don’t hard-crash; still allow app to run but user may appear “missing profile”.
          console.error('ensureProfile failed:', e?.message || e);
        }

        await loadUserProfile(sessionUser.id, { force: true });
      } else {
        setUser(null);
        lastProfileUserIdRef.current = null;
      }
    },
    [ensureProfile, loadUserProfile]
  );

  const initAuth = useCallback(async () => {
    const res = await withTimeout(supabase.auth.getSession(), 8000);
    const u = res.data.session?.user ?? null;
    await hydrateFromSession(u);
  }, [hydrateFromSession]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setBooting(true);
      try {
        await initAuth();
      } catch (e: any) {
        console.error('Auth init error:', e?.message || String(e));
        setAuthUser(null);
        setUser(null);
        lastProfileUserIdRef.current = null;
      } finally {
        if (alive) setBooting(false);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (!alive) return;

      const u = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        reqIdRef.current += 1;
        inflightProfileRef.current = null;
        lastProfileUserIdRef.current = null;

        setAuthUser(null);
        setUser(null);

        const p = pathnameRef.current || '/';
        if (!isPublicPath(p)) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
        else router.replace('/');

        return;
      }

      // INITIAL_SESSION / SIGNED_IN should hydrate profile. [web:280]
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        await hydrateFromSession(u);
        return;
      }

      // TOKEN_REFRESHED can fire often; don’t refetch profile every time. [web:280]
      if (event === 'TOKEN_REFRESHED') {
        setAuthUser((prev) => (prev?.id === u?.id ? prev : u));
        return;
      }

      if (event === 'USER_UPDATED') {
        setAuthUser((prev) => (prev?.id === u?.id ? prev : u));
        if (u?.id) {
          await loadUserProfile(u.id, { force: true });
        }
        return;
      }

      // Fallback: keep authUser in sync
      setAuthUser((prev) => (prev?.id === u?.id ? prev : u));
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, initAuth, hydrateFromSession, loadUserProfile]);

  const refreshUser = useCallback(async () => {
    const uid = authUser?.id;
    if (!uid) return;
    await loadUserProfile(uid, { force: true });
  }, [authUser?.id, loadUserProfile]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error.message);

    reqIdRef.current += 1;
    inflightProfileRef.current = null;
    lastProfileUserIdRef.current = null;

    setAuthUser(null);
    setUser(null);

    router.replace('/');
  }, [router]);

  const value = useMemo(
    () => ({ user, authUser, loading: booting, logout, refreshUser }),
    [user, authUser, booting, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
