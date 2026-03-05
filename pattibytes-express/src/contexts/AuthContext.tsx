/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState, type ReactNode,
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
  user: Profile | null;
  authUser: SupabaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const PROFILE_SELECT =
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

// ── Module-level ensureProfile cache ─────────────────────────────────────────
// Prevents duplicate SELECT+INSERT on Google One-Tap / rapid re-renders
const ensureCache = new Map<string, Profile>();

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user, setUser]         = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [booting, setBooting]   = useState(true);

  const userRef          = useRef<Profile | null>(null);
  const pathnameRef      = useRef('/');
  const reqIdRef         = useRef(0);
  const lastUidRef       = useRef<string | null>(null);
  const inflightRef      = useRef<Promise<Profile | null> | null>(null);

  // ✅ KEY FIX: tracks whether initAuth already handled the current session
  // Prevents INITIAL_SESSION / SIGNED_IN from re-running hydrateFromSession
  const bootHandledForRef = useRef<string | null>(null);

  useEffect(() => { userRef.current  = user; },    [user]);
  useEffect(() => { pathnameRef.current = pathname || '/'; }, [pathname]);

  // ── Fetch profile from DB ─────────────────────────────────────────────────
  const loadUserProfile = useCallback(async (
    userId: string,
    opts?: { force?: boolean }
  ): Promise<Profile | null> => {
    if (!userId) return null;

    // Return cached profile for same user (unless forced)
    if (!opts?.force && lastUidRef.current === userId && userRef.current) {
      return userRef.current;
    }

    // Deduplicate concurrent fetches for same user
    if (inflightRef.current && lastUidRef.current === userId) {
      return inflightRef.current;
    }

    const rid = ++reqIdRef.current;

    const promise = (async (): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();

        if (rid !== reqIdRef.current) return null; // stale — newer request overtook

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

  // ── Ensure profile row exists (Google One-Tap / OAuth) ───────────────────
  const ensureProfile = useCallback(async (u: SupabaseUser): Promise<void> => {
    // ✅ Skip if already ensured this session (prevents duplicate DB calls)
    if (ensureCache.has(u.id)) return;

    const { data: existing, error: e1 } = await supabase
      .from('profiles').select(PROFILE_SELECT).eq('id', u.id).maybeSingle();

    if (e1) { console.error('ensureProfile select:', e1.message); return; }

    if (existing) {
      ensureCache.set(u.id, existing as unknown as Profile);
      return;
    }

    // Profile missing — create it (Google sign-in first time)
    const payload = {
      id:               u.id,
      email:            u.email,
      full_name:        u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'User',
      phone:            u.phone ?? u.user_metadata?.phone ?? '',
      role:             'customer',
      approval_status:  'approved',
      profile_completed: true,
      is_active:        true,
      avatar_url:       u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? '',
    };

    const { data: created, error: e2 } = await supabase
      .from('profiles').insert([payload]).select(PROFILE_SELECT).single();

    if (e2) { console.error('ensureProfile insert:', e2.message); return; }
    if (created) ensureCache.set(u.id, created as unknown as Profile);
  }, []);

  // ── Hydrate state from a session user ────────────────────────────────────
  const hydrateFromSession = useCallback(async (
    sessionUser: SupabaseUser | null,
    opts?: { force?: boolean }
  ) => {
    setAuthUser(prev => prev?.id === sessionUser?.id ? prev : sessionUser);

    if (sessionUser?.id) {
      await ensureProfile(sessionUser);
      await loadUserProfile(sessionUser.id, opts);
    } else {
      setUser(null);
      lastUidRef.current = null;
    }
  }, [ensureProfile, loadUserProfile]);

  // ── Boot once ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      setBooting(true);
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 8000);
        const u = session?.user ?? null;

        // Mark which user initAuth handled so INITIAL_SESSION can skip
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

        // ── SIGNED_OUT ───────────────────────────────────────────────────
        if (event === 'SIGNED_OUT') {
          reqIdRef.current++;
          inflightRef.current = null;
          lastUidRef.current  = null;
          bootHandledForRef.current = null;
          if (u?.id) ensureCache.delete(u.id);

          setAuthUser(null); setUser(null);

          const p = pathnameRef.current;
          if (!isPublicPath(p)) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
          else router.replace('/');
          return;
        }

        // ── INITIAL_SESSION / SIGNED_IN ──────────────────────────────────
        // ✅ Skip if initAuth already handled this exact user — prevents double hydration
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          const alreadyHandled = bootHandledForRef.current === (u?.id ?? '__guest__');
          if (alreadyHandled) {
            // Just sync authUser reference — no DB call
            setAuthUser(prev => prev?.id === u?.id ? prev : u);
            return;
          }
          // New user (e.g. Google One-Tap mid-session) — hydrate fully
          bootHandledForRef.current = u?.id ?? '__guest__';
          await hydrateFromSession(u, { force: true });
          return;
        }

        // ── TOKEN_REFRESHED — never re-fetch profile ─────────────────────
        if (event === 'TOKEN_REFRESHED') {
          setAuthUser(prev => prev?.id === u?.id ? prev : u);
          return;
        }

        // ── USER_UPDATED — re-fetch profile only ─────────────────────────
        if (event === 'USER_UPDATED') {
          setAuthUser(prev => prev?.id === u?.id ? prev : u);
          if (u?.id) await loadUserProfile(u.id, { force: true });
          return;
        }

        // Fallback — keep authUser in sync, no DB call
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
    inflightRef.current = null;
    lastUidRef.current  = null;
    bootHandledForRef.current = null;
    if (uid) ensureCache.delete(uid);

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
