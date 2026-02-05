 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

// IMPORTANT:
// Use whichever matches your supabase client export.
// If your file is: export const supabase = createClient(...)
// keep this:
import { supabase } from '@/lib/supabase';
// If your file is: export default supabase
// then change to: import supabase from '@/lib/supabase';

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

interface AuthContextType {
  user: Profile | null;
  authUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  authUser: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Note: useContext will always return something because we have a default value.
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        const {
          data: { user: u },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          // Only log real errors (missing session is normal when logged out)
          if (error.message !== 'Auth session missing!' && (error as any).status !== 400) {
            console.error('Error getting user:', error.message);
          }
          if (!mounted) return;
          setAuthUser(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (!mounted) return;

        if (u) {
          setAuthUser(u);
          await loadUserProfile(u.id);
        } else {
          setAuthUser(null);
          setUser(null);
        }
      } catch {
        if (!mounted) return;
        setAuthUser(null);
        setUser(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    const loadUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

        if (error) {
          // PGRST116 = "Results contain 0 rows" in many setups; treat as "no profile".
          if (error.code !== 'PGRST116') {
            console.error('Profile fetch error:', error.message);
          }
          if (!mounted) return;
          setUser(null);
          return;
        }

        if (!mounted) return;

        if (data) {
          setUser(data as Profile);
        } else {
          setUser(null);
        }
      } catch (e: any) {
        console.error('Error loading user profile:', e?.message || String(e));
        if (!mounted) return;
        setUser(null);
      }
    };

    // Make loadUserProfile available to other closures in this effect
    (globalThis as any).__loadUserProfile = loadUserProfile;

    // Initial auth check
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setAuthUser(session.user);
          await loadUserProfile(session.user.id);
        }
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthUser(null);

        // Redirect to login with current path for protected routes
        if (
          pathname &&
          !pathname.startsWith('/login') &&
          !pathname.startsWith('/signup') &&
          pathname !== '/'
        ) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        } else {
          router.push('/');
        }
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const loadUserProfile = async (userId: string) => {
    // same logic as above, but accessible outside useEffect
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') console.error('Profile fetch error:', error.message);
        setUser(null);
        return;
      }

      setUser(data ? (data as Profile) : null);
    } catch (e: any) {
      console.error('Error loading user profile:', e?.message || String(e));
      setUser(null);
    }
  };

  const checkUser = async () => {
    try {
      const {
        data: { user: u },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        if (error.message !== 'Auth session missing!' && (error as any).status !== 400) {
          console.error('Error getting user:', error.message);
        }
        setAuthUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (u) {
        setAuthUser(u);
        await loadUserProfile(u.id);
      } else {
        setAuthUser(null);
        setUser(null);
      }
    } catch {
      setAuthUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (authUser) {
      await loadUserProfile(authUser.id);
    } else {
      await checkUser();
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();
      if (error) console.error('Logout error:', error.message);

      setUser(null);
      setAuthUser(null);

      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Error logging out:', e instanceof Error ? e.message : String(e));
      setUser(null);
      setAuthUser(null);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
