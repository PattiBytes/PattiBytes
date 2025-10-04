import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  ReactNode,
  useRef
} from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  Unsubscribe,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { UserProfile, updateUserOnlineStatus } from '@/lib/username';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  reloadUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const profileUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const onlineStatusUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update online status periodically
  const updateOnlineStatus = useCallback(async (uid: string, isOnline: boolean) => {
    try {
      await updateUserOnlineStatus(uid, isOnline);
    } catch (error) {
      console.warn('Failed to update online status:', error);
    }
  }, []);

  // Setup auth state listener
  useEffect(() => {
    // Don't initialize during SSR
    if (typeof window === 'undefined') return;

    const { auth, db } = getFirebaseClient();
    
    // If Firebase wasn't initialized properly, set loading to false
    if (!auth || !db) {
      setLoading(false);
      setError('Firebase configuration not available');
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setError(null);
      
      // Clean up previous profile listener
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
      
      // Clear online status timer
      if (onlineStatusUpdateRef.current) {
        clearInterval(onlineStatusUpdateRef.current);
        onlineStatusUpdateRef.current = null;
      }
      
      if (currentUser) {
        // Listen to user profile changes in real-time
        profileUnsubscribeRef.current = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (doc) => {
            if (doc.exists()) {
              const profile = doc.data() as UserProfile;
              setUserProfile(profile);
              
              // Start online status updates
              updateOnlineStatus(currentUser.uid, true);
              onlineStatusUpdateRef.current = setInterval(() => {
                updateOnlineStatus(currentUser.uid, true);
              }, 60000); // Update every minute
              
            } else {
              setUserProfile(null);
            }
            setLoading(false);
            setIsInitialized(true);
          },
          (error) => {
            console.error('Error listening to user profile:', error);
            setError('Failed to load user profile');
            setUserProfile(null);
            setLoading(false);
            setIsInitialized(true);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
        setIsInitialized(true);
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      setError('Authentication error occurred');
      setLoading(false);
      setIsInitialized(true);
    });

    // Handle page visibility for online status
    const handleVisibilityChange = () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        updateOnlineStatus(currentUser.uid, !document.hidden);
      }
    };

    // Handle beforeunload for offline status
    const handleBeforeUnload = () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        updateOnlineStatus(currentUser.uid, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeAuth();
      
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
      }
      
      if (onlineStatusUpdateRef.current) {
        clearInterval(onlineStatusUpdateRef.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set user offline on cleanup
      const currentUser = auth.currentUser;
      if (currentUser) {
        updateOnlineStatus(currentUser.uid, false);
      }
    };
  }, [updateOnlineStatus]);

  // Sign out handler
  const signOut = useCallback(async () => {
    const { auth } = getFirebaseClient();
    if (!auth) throw new Error('Firebase not initialized');

    try {
      setError(null);
      
      // Set user offline before signing out
      if (user) {
        await updateOnlineStatus(user.uid, false);
      }
      
      await firebaseSignOut(auth);
      
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
      throw error;
    }
  }, [user, updateOnlineStatus]);

  // Send password reset email
  const sendPasswordReset = useCallback(async (email: string) => {
    const { auth } = getFirebaseClient();
    if (!auth) throw new Error('Firebase not initialized');

    try {
      setError(null);
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/login`,
        handleCodeInApp: false
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setError('Failed to send password reset email');
      throw error;
    }
  }, []);

  // Confirm password reset
  const confirmPasswordResetHandler = useCallback(async (code: string, newPassword: string) => {
    const { auth } = getFirebaseClient();
    if (!auth) throw new Error('Firebase not initialized');

    try {
      setError(null);
      await confirmPasswordReset(auth, code, newPassword);
    } catch (error) {
      console.error('Error confirming password reset:', error);
      setError('Failed to reset password');
      throw error;
    }
  }, []);

  // Send email verification
  const sendVerificationEmail = useCallback(async () => {
    const { auth } = getFirebaseClient();
    if (!auth) throw new Error('Firebase not initialized');

    try {
      setError(null);
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser, {
          url: `${window.location.origin}/dashboard`,
          handleCodeInApp: false
        });
      } else {
        throw new Error('No user is currently signed in');
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      setError('Failed to send verification email');
      throw error;
    }
  }, []);

  // Refresh user profile
  const refreshUserProfile = useCallback(async () => {
    if (!user) return;
    
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firebase not initialized');
    
    try {
      setError(null);
      // Trigger a timestamp update to refresh the listener
      await setDoc(doc(db, 'users', user.uid), {
        lastSeen: serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      setError('Failed to refresh profile');
    }
  }, [user]);

  // Reload user from Firebase Auth
  const reloadUser = useCallback(async () => {
    const { auth } = getFirebaseClient();
    if (!auth) throw new Error('Firebase not initialized');

    try {
      setError(null);
      if (auth.currentUser) {
        await reload(auth.currentUser);
      }
    } catch (error) {
      console.error('Error reloading user:', error);
      setError('Failed to reload user data');
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    userProfile,
    loading: loading || !isInitialized,
    error,
    signOut,
    sendPasswordReset,
    confirmPasswordReset: confirmPasswordResetHandler,
    sendVerificationEmail,
    refreshUserProfile,
    reloadUser,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook for auth actions with loading states
export function useAuthActions() {
  const auth = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const withLoading = useCallback(async <T,>(
    action: () => Promise<T>,
    actionName: string
  ): Promise<T> => {
    setActionLoading(actionName);
    try {
      const result = await action();
      return result;
    } finally {
      setActionLoading(null);
    }
  }, []);

  return {
    ...auth,
    actionLoading,
    signOutWithLoading: () => withLoading(auth.signOut, 'signOut'),
    sendPasswordResetWithLoading: (email: string) => 
      withLoading(() => auth.sendPasswordReset(email), 'passwordReset'),
    sendVerificationEmailWithLoading: () => 
      withLoading(auth.sendVerificationEmail, 'verification')
  };
}
