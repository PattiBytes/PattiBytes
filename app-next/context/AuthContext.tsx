import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  type User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import {
  type UserProfile,
  getUserProfile,
  createUserProfile,
  isUsernameTaken,
  isFirestoreInternalAssertion,
} from '@/lib/username';
import { useRouter } from 'next/router';
import { isAdmin as checkAdmin } from '@/lib/admin';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;

  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;

  // Keeping this for backward compatibility if you still use it somewhere.
  // If you now always do setup-username, you may stop calling this.
  signUpWithEmail: (
    email: string,
    password: string,
    username: string,
    displayName: string,
  ) => Promise<void>;

  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { auth, db } = getFirebaseClient();

  // Presence effect: silent, non-blocking
  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);

    const setOnline = async () => {
      try {
        await setDoc(
          userRef,
          {
            onlineStatus: 'online',
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
      } catch {
        // ignore
      }
    };

    const setOffline = async () => {
      try {
        await setDoc(
          userRef,
          {
            onlineStatus: 'offline',
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
      } catch {
        // ignore
      }
    };

    void setOnline();

    const onVis = () => {
      if (document.visibilityState === 'hidden') void setOffline();
      else void setOnline();
    };
    document.addEventListener('visibilitychange', onVis);

    const beforeUnload = () => void setOffline();
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', beforeUnload);
      void setOffline();
    };
  }, [user, db]);

  // Auth state listener - initial profile load + admin check
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile || null);

        try {
          const adminStatus = await checkAdmin(firebaseUser.uid);
          setIsAdmin(adminStatus);
        } catch (err) {
          console.error('[AuthContext] Admin check error:', err);
          setIsAdmin(false);
        }
      } catch (err) {
        if (isFirestoreInternalAssertion(err)) {
          console.warn(
            '[AuthContext] Ignoring Firestore internal assertion in getUserProfile:',
            err,
          );
        } else {
          console.error('[AuthContext] Failed to load user profile:', err);
        }
        setUserProfile(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // Realtime profile listener
  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          try {
            const profileData = snapshot.data() as Omit<UserProfile, 'uid'>;
            setUserProfile({ uid: user.uid, ...profileData });
          } catch (err) {
            console.error('[AuthContext] Error processing snapshot:', err);
          }
        } else {
          setUserProfile(null);
        }
      },
      (error) => {
        if (isFirestoreInternalAssertion(error)) {
          console.warn(
            '[AuthContext] Ignoring Firestore internal assertion in profile listener (SDK bug):',
            error,
          );
          return;
        }
        console.error('[AuthContext] User profile listener error:', error);
      },
    );

    return () => unsubscribe();
  }, [user, db]);

  // Ensures a minimal user doc exists (useful for fresh Google sign-ins)
  const ensureUserDoc = async (u: User) => {
    if (!db) return;

    try {
      const existing = await getUserProfile(u.uid);
      if (existing) return;

      const displayName =
        u.displayName ||
        (u.email ? u.email.split('@')[0] : 'User');

      await setDoc(
        doc(db, 'users', u.uid),
        {
          email: u.email || null,
          displayName,
          displayNameLower: String(displayName).toLowerCase(),
          photoURL: u.photoURL || null,
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      // Keep Firebase Auth profile aligned (optional)
      if (auth?.currentUser && auth.currentUser.displayName !== displayName) {
        await updateAuthProfile(auth.currentUser, { displayName });
      }
    } catch (err) {
      if (isFirestoreInternalAssertion(err)) {
        console.warn('[AuthContext] Ignoring Firestore internal assertion in ensureUserDoc:', err);
        return;
      }
      console.error('[AuthContext] ensureUserDoc error:', err);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Auth not initialized');

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Do NOT route here.
    // Routing is handled by AuthGuard/RedirectIfAuthenticated (setup-username first).
    await ensureUserDoc(result.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth not initialized');
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // Optional safety: ensure doc exists for legacy users
    await ensureUserDoc(cred.user);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
  ) => {
    if (!auth || !db) throw new Error('Auth not initialized');

    if (await isUsernameTaken(username)) {
      throw new Error('Username already taken');
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const u = userCredential.user;

    await createUserProfile({
      uid: u.uid,
      username,
      email,
      displayName,
      photoURL: u.photoURL || undefined,
    });
  };

  const signOut = async () => {
    if (!auth || !db) return;

    try {
      if (user) {
        await setDoc(
          doc(db, 'users', user.uid),
          { onlineStatus: 'offline', lastSeen: serverTimestamp() },
          { merge: true },
        );
      }

      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      router.replace('/auth/login');
    } catch (error) {
      throw error;
    }
  };

  const reloadUser = async () => {
    if (!user) return;

    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile || null);
    } catch (err) {
      if (isFirestoreInternalAssertion(err)) {
        console.warn('[AuthContext] Ignoring Firestore internal assertion in reloadUser:', err);
      } else {
        console.error('[AuthContext] reloadUser error:', err);
      }
      setUserProfile(null);
    }

    try {
      const adminStatus = await checkAdmin(user.uid);
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('[AuthContext] reloadUser admin check error:', err);
      setIsAdmin(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error('Auth not initialized');
    await sendPasswordResetEmail(auth, email);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAdmin,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    reloadUser,
    sendPasswordReset,
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
