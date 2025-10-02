import { FormEvent, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { RedirectIfAuthenticated } from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import { FaGoogle, FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

interface WindowWithGtag extends Window {
  gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Auto-focus email input
  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { auth } = getFirebaseClient();
      await signInWithEmailAndPassword(auth, email, password);
      
      // Analytics event (optional)
      if (typeof window !== 'undefined') {
        const windowWithGtag = window as WindowWithGtag;
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'login', {
            method: 'email'
          });
        }
      }
      
      router.push('/dashboard');
    } catch (e) {
      if (e instanceof FirebaseError) {
        switch (e.code) {
          case 'auth/user-not-found':
            setError('No account found with this email');
            break;
          case 'auth/wrong-password':
            setError('Incorrect password');
            break;
          case 'auth/invalid-email':
            setError('Invalid email address');
            break;
          case 'auth/user-disabled':
            setError('This account has been disabled');
            break;
          case 'auth/too-many-requests':
            setError('Too many failed attempts. Please try again later');
            break;
          case 'auth/invalid-credential':
            setError('Invalid email or password');
            break;
          default:
            setError('Login failed. Please try again.');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { auth, db, googleProvider } = getFirebaseClient();
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user has a profile and username
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      // Analytics event
      if (typeof window !== 'undefined') {
        const windowWithGtag = window as WindowWithGtag;
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'login', {
            method: 'google'
          });
        }
      }
      
      if (!userDoc.exists() || !userDoc.data()?.username) {
        // New user or user without username - redirect to setup
        router.push('/auth/setup-username');
      } else {
        // Existing user with username - go to dashboard
        router.push('/dashboard');
      }
    } catch (e) {
      if (e instanceof FirebaseError) {
        switch (e.code) {
          case 'auth/popup-closed-by-user':
            setError('Sign-in was cancelled');
            break;
          case 'auth/popup-blocked':
            setError('Popup was blocked. Please enable popups and try again');
            break;
          case 'auth/account-exists-with-different-credential':
            setError('An account with this email already exists with a different sign-in method');
            break;
          case 'auth/cancelled-popup-request':
            // User cancelled, don't show error
            break;
          default:
            setError('Google sign-in failed. Please try again.');
        }
      } else {
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
          {/* Logo and Header */}
          <div className={styles.authHeader}>
            <motion.div 
              className={styles.logoContainer}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Image
                src="/images/logo.png" // Add your logo path
                alt="PattiBytes"
                width={60}
                height={60}
                className={styles.logo}
              />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              ਵਾਪਸ ਆਓ
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Welcome back to PattiBytes
            </motion.p>
          </div>

          <motion.div 
            className={styles.authCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {/* Google Sign In */}
            <button 
              onClick={handleGoogleLogin} 
              className={styles.googleBtn} 
              disabled={loading}
              type="button"
            >
              <FaGoogle />
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email">
                  <FaEnvelope />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                  className={error ? styles.inputError : ''}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">
                  <FaLock />
                  Password
                </label>
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
                    className={error ? styles.inputError : ''}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.formOptions}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
                
                <Link href="/auth/reset" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>

              <motion.button 
                type="submit" 
                className={styles.submitBtn}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner} />
                    Signing in...
                  </>
                ) : (
                  'Log in'
                )}
              </motion.button>

              {error && (
                <motion.div 
                  className={styles.error}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {error}
                </motion.div>
              )}
            </form>

            <div className={styles.authFooter}>
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/auth/register">Create account</Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </RedirectIfAuthenticated>
  );
}
