// app-next/context/AuthContext.tsx
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

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    null,
  );
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
        // ignore presence errors
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

    const beforeUnload = () => {
      void setOffline();
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', beforeUnload);
      void setOffline();
    };
  }, [user, db]);

  // Auth state listener
useEffect(() => {
  if (!auth) return;

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    setUser(firebaseUser);
    if (firebaseUser) {
      try {
        const profile = await getUserProfile(firebaseUser.uid);
        console.log('[AuthContext] profile for', firebaseUser.uid, profile);
        setUserProfile(profile || null);
      } catch (err) {
        if (isFirestoreInternalAssertion(err)) {
          console.warn(
            '[AuthContext] Ignoring Firestore internal assertion in getUserProfile:',
            err,
          );
        } else {
          console.error(
            '[AuthContext] Failed to load user profile:',
            err,
          );
        }
        setUserProfile(null);
      }

      // admin flag unchanged...
    } else {
      setUserProfile(null);
      setIsAdmin(false);
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, [auth]);


 

// Realtime profile updates with error handler to swallow the Firestore bug
useEffect(() => {
  if (!user || !db) return;

  // Avoid Firestore listeners in development to sidestep INTERNAL ASSERTION bug
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  const userRef = doc(db, 'users', user.uid);

  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile({
          uid: user.uid,
          ...(snapshot.data() as Omit<UserProfile, 'uid'>),
        });
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
      console.error(
        '[AuthContext] User profile listener error:',
        error,
      );
    },
  );

  return () => unsubscribe();
}, [user, db]);


  const signInWithGoogle = async () => {
    if (!auth || !db) throw new Error('Auth not initialized');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const u = result.user;
    const existingProfile = await getUserProfile(u.uid);
    if (!existingProfile) {
      router.push('/auth/complete-profile');
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string,
  ) => {
    if (!auth) throw new Error('Auth not initialized');
    await signInWithEmailAndPassword(auth, email, password);
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
        console.warn(
          '[AuthContext] Ignoring Firestore internal assertion in reloadUser:',
          err,
        );
      } else {
        console.error('[AuthContext] reloadUser error:', err);
      }
      setUserProfile(null);
    }
    try {
      setIsAdmin(await checkAdmin(user.uid));
    } catch (err) {
      console.error(
        '[AuthContext] reloadUser admin check error:',
        err,
      );
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
      {loading ? null : children}
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
