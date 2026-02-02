/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

interface Profile {
  user_metadata: any;
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  approval_status?: string;
  avatar_url?: string;
  logo_url?: string;
  addresses?: any[];
  profile_completed?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  id(id: unknown): unknown;
  id: unknown;
  id: any;
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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
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

    // Initial auth check
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!mounted) return;

        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setAuthUser(session.user);
            await loadUserProfile(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthUser(null);

          // Redirect to login with current path for protected routes
          if (pathname && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && pathname !== '/') {
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          } else {
            router.push('/');
          }
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            setAuthUser(session.user);
            await loadUserProfile(session.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const checkUser = async () => {
    try {
      // Use getUser() for secure verification
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        // Only log actual errors, not "no session" which is expected when logged out
        if (error.message !== 'Auth session missing!' && error.status !== 400) {
          console.error('Error getting user:', error.message);
        }
        setAuthUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (authUser) {
        setAuthUser(authUser);
        await loadUserProfile(authUser.id);
      } else {
        setAuthUser(null);
        setUser(null);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Silently handle auth errors during initial check
      setAuthUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Profile fetch error:', error.message);
        }
        setUser(null);
        return;
      }

      if (data) {
        console.log('Profile loaded successfully:', data.role);
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Error loading user profile:', error?.message || String(error));
      setUser(null);
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

      if (error) {
        console.error('Logout error:', error.message);
      }

      setUser(null);
      setAuthUser(null);

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error instanceof Error ? error.message : String(error));
      setUser(null);
      setAuthUser(null);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return <AuthContext.Provider value={{ user, authUser, loading, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
