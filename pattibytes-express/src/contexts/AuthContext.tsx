/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  approval_status?: string;
  avatar_url?: string;
   
  addresses?: any[];
  profile_completed?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: Profile | null;
  authUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
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
    // Initial auth check with secure getUser()
    checkUser();
    
    // Listen for auth changes but ALWAYS verify with getUser()
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent) => {
        console.log('Auth event:', event);

        // ✅ SECURE: Always verify session with getUser()
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            // Verify the session is authentic
            const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
            
            if (error) {
              console.error('Error verifying user:', {
                message: error.message,
                status: error.status,
                code: (error as any)?.code,
              });
              setUser(null);
              setAuthUser(null);
              return;
            }

            if (verifiedUser) {
              setAuthUser(verifiedUser);
              await loadUserProfile(verifiedUser.id);
            }
          } catch (error) {
            console.error('Error in auth state change:', error instanceof Error ? error.message : error);
            setUser(null);
            setAuthUser(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthUser(null);
          
          // Redirect to home if on protected route
          if (!pathname.startsWith('/auth') && pathname !== '/') {
            router.push('/');
          }
        } else if (event === 'USER_UPDATED') {
          // Verify and refresh user data
          const { data: { user: verifiedUser } } = await supabase.auth.getUser();
          if (verifiedUser) {
            setAuthUser(verifiedUser);
            await loadUserProfile(verifiedUser.id);
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  const checkUser = async () => {
    try {
      // ✅ SECURE: Using getUser() instead of getSession()
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        setAuthUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (authUser) {
        setAuthUser(authUser);
        await loadUserProfile(authUser.id);
      } else {
        // No authenticated user - this is normal for logged out state
        setAuthUser(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error instanceof Error ? error.message : String(error));
      setAuthUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // Profile not found - user might need to complete signup
        if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
          console.warn('Profile not found for user:', userId);
          setUser(null);
          return;
        }
        
        throw error;
      }

      if (data) {
        setUser(data);
      } else {
        console.warn('No profile data returned for user:', userId);
        setUser(null);
      }
    } catch (error: any) {
      console.error('Error loading user profile:', {
        message: error?.message || String(error),
        code: error?.code,
        userId,
      });
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (authUser) {
      await loadUserProfile(authUser.id);
    } else {
      // If no authUser, check again
      await checkUser();
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error.message);
        // Still clear local state even if API call fails
      }

      // Clear state
      setUser(null);
      setAuthUser(null);
      
      // Redirect to home
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error instanceof Error ? error.message : String(error));
      // Still clear state on error
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
