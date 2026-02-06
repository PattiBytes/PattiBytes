 
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

  // optional extras if you use them
  account_status?: string | null;
  is_approved?: boolean | null;
}

export interface AuthContextType {
  user: Profile | null;
  authUser: SupabaseUser | null;
  loading: boolean; // booting only
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

function isPublicPath(p: string) {
  return p === '/' || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/auth/');
}

// Don’t select '*' (faster + less re-render noise)
const PROFILE_SELECT =
  'id,email,full_name,phone,role,approval_status,avatar_url,profile_completed,is_active,created_at,updated_at,account_status,is_approved';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef<string>('/');

  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);

  // Only for initial session hydration
  const [booting, setBooting] = useState(true);

  // request/race guards
  const reqIdRef = useRef(0);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<Profile | null> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname || '/';
  }, [pathname]);

  const loadUserProfile = useCallback(async (userId: string, opts?: { force?: boolean }) => {
    if (!userId) return null;

    if (!opts?.force && lastProfileUserIdRef.current === userId) return user;
    if (inflightRef.current) return inflightRef.current;

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
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, [user]);

  const initAuth = useCallback(async () => {
    const res = await withTimeout(supabase.auth.getSession(), 2500);
    const u = res.data.session?.user ?? null;

    // Only set state if changed (reduces re-render churn)
    setAuthUser((prev) => (prev?.id === u?.id ? prev : u));

    if (u?.id) {
      void loadUserProfile(u.id, { force: false });
    } else {
      setUser(null);
      lastProfileUserIdRef.current = null;
    }
  }, [loadUserProfile]);

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

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (!alive) return;

      if (event === 'SIGNED_OUT') {
        reqIdRef.current += 1;
        inflightRef.current = null;
        lastProfileUserIdRef.current = null;

        setAuthUser(null);
        setUser(null);

        const p = pathnameRef.current || '/';
        if (!isPublicPath(p)) router.replace(`/login?redirect=${encodeURIComponent(p)}`);
        else router.replace('/');

        return;
      }

      // IMPORTANT:
      // TOKEN_REFRESHED can fire repeatedly; don’t refetch profile each time. [web:12]
      if (event === 'TOKEN_REFRESHED') {
        const u = session?.user ?? null;
        setAuthUser((prev) => (prev?.id === u?.id ? prev : u));
        return;
      }

      // For real state changes, update auth user and profile
      const u = session?.user ?? null;
      setAuthUser((prev) => (prev?.id === u?.id ? prev : u));

      if (u?.id) {
        const idChanged = lastProfileUserIdRef.current !== u.id;
        // Refetch only when needed
        void loadUserProfile(u.id, { force: event === 'USER_UPDATED' || idChanged });
      } else {
        setUser(null);
        lastProfileUserIdRef.current = null;
      }
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, initAuth, loadUserProfile]);

  const refreshUser = useCallback(async () => {
    const uid = authUser?.id;
    if (!uid) return;
    await loadUserProfile(uid, { force: true });
  }, [authUser?.id, loadUserProfile]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error.message);

    reqIdRef.current += 1;
    inflightRef.current = null;
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
