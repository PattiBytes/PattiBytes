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
  reload,
  setPersistence,
  browserLocalPersistence
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateOnlineStatus = useCallback(async (uid: string, isOnline: boolean) => {
    try {
      await updateUserOnlineStatus(uid, isOnline);
    } catch (error) {
      console.warn('Failed to update online status:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { auth, db } = getFirebaseClient();
    
    if (!auth || !db) {
      setLoading(false);
      setError('Firebase configuration not available');
      return;
    }

    // Set persistence for faster login
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setError(null);
      
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
      
      if (onlineStatusUpdateRef.current) {
        clearInterval(onlineStatusUpdateRef.current);
        onlineStatusUpdateRef.current = null;
      }
      
      if (currentUser) {
        profileUnsubscribeRef.current = onSnapshot(
          doc(db, 'users', currentUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);
              
              updateOnlineStatus(currentUser.uid, true);
              onlineStatusUpdateRef.current = setInterval(() => {
                updateOnlineStatus(currentUser.uid, true);
              }, 60000);
              
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

    const handleVisibilityChange = () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        updateOnlineStatus(currentUser.uid, !document.hidden);
      }
    };

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
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        updateOnlineStatus(currentUser.uid, false);
      }
    };
  }, [updateOnlineStatus]);

  const signOut = useCallback(async () => {
    const { auth } = getFirebaseClient();
    if (!auth) throw new Error('Firebase not initialized');

    try {
      setError(null);
      
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

  const refreshUserProfile = useCallback(async () => {
    if (!user) return;
    
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firebase not initialized');
    
    try {
      setError(null);
      await setDoc(doc(db, 'users', user.uid), {
        lastSeen: serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      setError('Failed to refresh profile');
    }
  }, [user]);

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
