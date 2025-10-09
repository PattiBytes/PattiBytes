import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail, // add
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { UserProfile, getUserProfile, createUserProfile, isUsernameTaken } from '@/lib/username';
import { useRouter } from 'next/router';
import { isAdmin as checkAdmin } from '@/lib/admin';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>; // add
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { auth, db } = getFirebaseClient();

  // Online status tracking
  useEffect(() => {
    if (!user || !db) return;
    const userRef = doc(db, 'users', user.uid);
    setDoc(
      userRef,
      { onlineStatus: 'online', lastSeen: serverTimestamp() },
      { merge: true }
    );
    return () => {
      setDoc(
        userRef,
        { onlineStatus: 'offline', lastSeen: serverTimestamp() },
        { merge: true }
      );
    };
  }, [user, db]);

  // Auth state listener (sets user, profile, admin)
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile || null);

        const admin = await checkAdmin(firebaseUser.uid);
        setIsAdmin(admin);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Real-time profile listener
  useEffect(() => {
    if (!user || !db) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile({ uid: user.uid, ...(snapshot.data() as Omit<UserProfile, 'uid'>) });
      }
    });
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

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error('Auth not initialized');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, username: string, displayName: string) => {
    if (!auth || !db) throw new Error('Auth not initialized');
    if (await isUsernameTaken(username)) {
      throw new Error('Username already taken');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
          { merge: true }
        );
      }
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      router.replace('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const reloadUser = async () => {
    if (!user) return;
    const profile = await getUserProfile(user.uid);
    setUserProfile(profile || null);
    setIsAdmin(await checkAdmin(user.uid));
  };

  // New: password reset
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
    sendPasswordReset, // expose
  };

  return <AuthContext.Provider value={value}>{loading ? null : children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
