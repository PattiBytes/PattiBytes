/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState, type ReactNode,
} from 'react';
import type { User as SupabaseUser, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { loginOneSignal, logoutOneSignal } from '@/lib/onesignal';

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
  user: Profile | null;
  authUser: SupabaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// ✅ logo_url included — run the SQL migration above if you get a 400 error
const PROFILE_SELECT =
  'id,email,full_name,phone,role,approval_status,avatar_url,logo_url,' +
  'profile_completed,is_active,created_at,updated_at,account_status,is_approved';

// Fallback select without logo_url — used automatically if column missing
const PROFILE_SELECT_FALLBACK =
  'id,email,full_name,phone,role,approval_status,avatar_url,' +
  'profile_completed,is_active,created_at,updated_at,account_status,is_approved';

function isPublicPath(p: string) {
  return p === '/' || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/auth/');
}

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Auth timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user, setUser]         = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [booting, setBooting]   = useState(true);

  const userRef           = useRef<Profile | null>(null);
  const pathnameRef       = useRef('/');
  const reqIdRef          = useRef(0);
  const lastUidRef        = useRef<string | null>(null);
  const inflightRef       = useRef<Promise<Profile | null> | null>(null);
  const bootHandledForRef = useRef<string | null>(null);
  // ✅ useRef instead of module-level — avoids edge runtime leaks
  const ensureCacheRef    = useRef(new Map<string, Profile>());
  // ✅ Track whether logo_url column exists — auto-detected on first fetch
  const hasLogoUrlCol     = useRef<boolean>(true);

  useEffect(() => { userRef.current    = user;            }, [user]);
  useEffect(() => { pathnameRef.current = pathname || '/'; }, [pathname]);

  // ── Fetch profile from DB ──────────────────────────────────────────────────
  const loadUserProfile = useCallback(async (
    userId: string,
    opts?: { force?: boolean }
  ): Promise<Profile | null> => {
    if (!userId) return null;

    if (!opts?.force && lastUidRef.current === userId && userRef.current) {
      return userRef.current;
    }

    if (inflightRef.current && lastUidRef.current === userId) {
      return inflightRef.current;
    }

    const rid = ++reqIdRef.current;

    const promise = (async (): Promise<Profile | null> => {
      try {
        // ✅ Auto-fallback if logo_url column not yet migrated
        const selectStr = hasLogoUrlCol.current ? PROFILE_SELECT : PROFILE_SELECT_FALLBACK;

        let { data, error } = await supabase
          .from('profiles').select(selectStr).eq('id', userId).maybeSingle();

        // If logo_url column missing, retry without it
        if (error?.message?.includes('logo_url')) {
          console.warn('[AuthContext] logo_url column missing — run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text');
          hasLogoUrlCol.current = false;
          const retry = await supabase
            .from('profiles').select(PROFILE_SELECT_FALLBACK).eq('id', userId).maybeSingle();
          data  = retry.data;
          error = retry.error;
        }

        if (rid !== reqIdRef.current) return null;

        if (error) {
          console.error('Profile fetch:', error.message);
          setUser(null); lastUidRef.current = null;
          return null;
        }

        const row = (data as unknown as Profile) ?? null;
        setUser(row);
        lastUidRef.current = row?.id ?? null;
        return row;
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, []);

  // ── Ensure profile row exists (Google One-Tap / OAuth) ────────────────────
  const ensureProfile = useCallback(async (u: SupabaseUser): Promise<void> => {
    if (ensureCacheRef.current.has(u.id)) return;

    const selectStr = hasLogoUrlCol.current ? PROFILE_SELECT : PROFILE_SELECT_FALLBACK;

    const { data: existing, error: e1 } = await supabase
      .from('profiles').select(selectStr).eq('id', u.id).maybeSingle();

    if (e1?.message?.includes('logo_url')) {
      hasLogoUrlCol.current = false;
    } else if (e1) {
      console.error('ensureProfile select:', e1.message);
      return;
    }

    if (existing) {
      ensureCacheRef.current.set(u.id, existing as unknown as Profile);
      return;
    }

    const payload = {
      id:                u.id,
      email:             u.email,
      full_name:         u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'User',
      phone:             u.phone ?? u.user_metadata?.phone ?? '',
      role:              'customer',
      approval_status:   'approved',
      profile_completed: true,
      is_active:         true,
      avatar_url:        u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? '',
    };

    const fallbackSelect = hasLogoUrlCol.current ? PROFILE_SELECT : PROFILE_SELECT_FALLBACK;
    const { data: created, error: e2 } = await supabase
      .from('profiles').insert([payload]).select(fallbackSelect).single();

    if (e2) { console.error('ensureProfile insert:', e2.message); return; }
    if (created) ensureCacheRef.current.set(u.id, created as unknown as Profile);
  }, []);

  // ── Hydrate + link OneSignal ──────────────────────────────────────────────
  const hydrateFromSession = useCallback(async (
    sessionUser: SupabaseUser | null,
    opts?: { force?: boolean }
  ) => {
    setAuthUser(prev => prev?.id === sessionUser?.id ? prev : sessionUser);

    if (sessionUser?.id) {
      await ensureProfile(sessionUser);
      const profile = await loadUserProfile(sessionUser.id, opts);

      // ✅ Link browser to OneSignal identity — enables web push
      if (typeof window !== 'undefined') {
        loginOneSignal(
          sessionUser.id,
          profile?.role ?? 'customer'
        ).catch(console.error);
      }
    } else {
      setUser(null);
      lastUidRef.current = null;
    }
  }, [ensureProfile, loadUserProfile]);

  // ── Boot once ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      setBooting(true);
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 8000);
        const u = session?.user ?? null;
        bootHandledForRef.current = u?.id ?? '__guest__';
        await hydrateFromSession(u, { force: true });
      } catch (e: any) {
        console.error('Auth init:', e?.message ?? e);
        setAuthUser(null); setUser(null);
        lastUidRef.current = null;
        bootHandledForRef.current = '__guest__';
      } finally {
        if (alive) setBooting(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!alive) return;
        const u = session?.user ?? null;

        if (event === 'SIGNED_OUT') {
          reqIdRef.current++;
          inflightRef.current       = null;
          lastUidRef.current        = null;
          bootHandledForRef.current = null;
          if (u?.id) ensureCacheRef.current.delete(u.id);
          setAuthUser(null); setUser(null);
          // ✅ Unlink OneSignal on sign-out
          if (typeof window !== 'undefined') logoutOneSignal().catch(console.error);
          const p = pathnameRef.current;
          if (!isPublicPath(p)) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
          else router.replace('/');
          return;
        }

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          const alreadyHandled = bootHandledForRef.current === (u?.id ?? '__guest__');
          if (alreadyHandled) {
            setAuthUser(prev => prev?.id === u?.id ? prev : u);
            return;
          }
          bootHandledForRef.current = u?.id ?? '__guest__';
          await hydrateFromSession(u, { force: true });
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setAuthUser(prev => prev?.id === u?.id ? prev : u);
          return;
        }

        if (event === 'USER_UPDATED') {
          setAuthUser(prev => prev?.id === u?.id ? prev : u);
          if (u?.id) await loadUserProfile(u.id, { force: true });
          return;
        }

        setAuthUser(prev => prev?.id === u?.id ? prev : u);
      }
    );

    return () => { alive = false; subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUser = useCallback(async () => {
    const uid = authUser?.id;
    if (!uid) return;
    await loadUserProfile(uid, { force: true });
  }, [authUser?.id, loadUserProfile]);

  const logout = useCallback(async () => {
    const uid = authUser?.id;
    reqIdRef.current++;
    inflightRef.current       = null;
    lastUidRef.current        = null;
    bootHandledForRef.current = null;
    if (uid) ensureCacheRef.current.delete(uid);
    if (typeof window !== 'undefined') await logoutOneSignal().catch(console.error);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout:', error.message);
    setAuthUser(null); setUser(null);
    router.replace('/');
  }, [authUser?.id, router]);

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

