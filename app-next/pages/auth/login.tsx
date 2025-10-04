import { FormEvent, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { RedirectIfAuthenticated } from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import { FaGoogle, FaEye, FaEyeSlash, FaUser, FaLock } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.getElementById('identifier')?.focus();
  }, []);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { auth, db } = getFirebaseClient();
    if (!auth || !db) {
      setError('Authentication service unavailable');
      setLoading(false);
      return;
    }

    try {
      let email = identifier;

      // Check if identifier is a username (no @ symbol)
      if (!identifier.includes('@')) {
        // Look up email by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', identifier.toLowerCase()), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('No account found with this username');
          setLoading(false);
          return;
        }

        email = snapshot.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (e) {
      const fe = e as FirebaseError;
      switch (fe.code) {
        case 'auth/user-not-found':
          setError('No account found');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    const { auth, db, googleProvider } = getFirebaseClient();
    if (!auth || !db || !googleProvider) {
      setError('Authentication service unavailable');
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists() || !userDoc.data()?.username) {
        router.push('/auth/setup-username');
      } else {
        router.push('/dashboard');
      }
    } catch (e) {
      const fe = e as FirebaseError;
      switch (fe.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign-in was cancelled');
          break;
        case 'auth/popup-blocked':
          setError('Popup was blocked. Enable popups and try again.');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('Account exists with different sign-in method');
          break;
        default:
          setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RedirectIfAuthenticated>
      <main className={styles.authPage}>
        <motion.div
          className={styles.authContainer}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.authHeader}>
            <motion.div
              className={styles.logoContainer}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <SafeImage
                src="/images/logo.png"
                alt="PattiBytes"
                width={60}
                height={60}
                className={styles.logo}
              />
            </motion.div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              Welcome Back
            </motion.h1>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              Sign in to PattiBytes
            </motion.p>
          </div>

          <motion.div className={styles.authCard} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <button onClick={handleGoogleLogin} className={styles.googleBtn} disabled={loading} type="button">
              <FaGoogle /> {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className={styles.divider}><span>OR</span></div>

            <form onSubmit={handleEmailLogin} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="identifier"><FaUser /> Email or Username</label>
                <input
                  id="identifier"
                  type="text"
                  placeholder="username or email@example.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value.trim())}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password"><FaLock /> Password</label>
                <div className={styles.passwordInput}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <Link href="/auth/reset-password" className={styles.forgotPassword}>
                Forgot password?
              </Link>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Logging in...' : 'Log In'}
              </button>

              {error && <div className={styles.error}>{error}</div>}

              <p className={styles.switch}>
                Don&apos;t have an account? <Link href="/auth/register">Sign up</Link>
              </p>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </RedirectIfAuthenticated>
  );
}
