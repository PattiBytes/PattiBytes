import { FormEvent, useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseClient } from '@/lib/firebase';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { RedirectIfAuthenticated } from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import { FaGoogle, FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';
import { useAuth } from '@/context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { signInWithGoogle, loading: authLoading } = useAuth();

  const busy = loading || authLoading;

  const handleEmailRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { auth } = getFirebaseClient();
    if (!auth) {
      setError('Authentication service unavailable');
      setLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      // New user must pick username first
      router.replace('/auth/setup-username');
    } catch (e) {
      const fe = e as FirebaseError;
      switch (fe.code) {
        case 'auth/email-already-in-use':
          setError('Email already in use');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak');
          break;
        default:
          setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setLoading(true);

    try {
      await signInWithGoogle();
      // RedirectIfAuthenticated will move user to setup-username if needed
    } catch (e) {
      const fe = e as FirebaseError;
      switch (fe.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign-in was cancelled');
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
            <SafeImage src="/images/logo.png" alt="PattiBytes" width={60} height={60} className={styles.logo} />
            <h1>Create Account</h1>
            <p>Join PattiBytes today</p>
          </div>

          <motion.div className={styles.authCard}>
            <button onClick={handleGoogleRegister} className={styles.googleBtn} disabled={busy} type="button">
              <FaGoogle /> {busy ? 'Signing up...' : 'Sign up with Google'}
            </button>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <form onSubmit={handleEmailRegister} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email">
                  <FaEnvelope /> Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={busy}
                  autoComplete="email"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">
                  <FaLock /> Password
                </label>
                <div className={styles.passwordInput}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={busy}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={busy}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">
                  <FaLock /> Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={busy}
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={busy}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>

              {error && <div className={styles.error}>{error}</div>}

              <p className={styles.switch}>
                Already have an account? <Link href="/auth/login">Log in</Link>
              </p>
            </form>
          </motion.div>
        </motion.div>
      </main>
    </RedirectIfAuthenticated>
  );
}
