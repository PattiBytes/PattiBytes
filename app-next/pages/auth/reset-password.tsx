import { FormEvent, useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseClient } from '@/lib/firebase';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { RedirectIfAuthenticated } from '@/components/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput && !success) {
      emailInput.focus();
    }
  }, [success]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { auth } = getFirebaseClient();
    if (!auth) {
      setError('Authentication service unavailable');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/login`,
        handleCodeInApp: false
      });
      setSuccess(true);
      setCountdown(60);
    } catch (error) {
      const fe = error as FirebaseError;
      switch (fe.code) {
        case 'auth/user-not-found':
          setError('No account found with this email address');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/too-many-requests':
          setError('Too many requests. Please try again later');
          break;
        default:
          setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setError(null);
    setLoading(true);
    
    const { auth } = getFirebaseClient();
    if (!auth) return;
    
    try {
      await sendPasswordResetEmail(auth, email);
      setCountdown(60);
    } catch (error) {
      console.error('Failed to resend email:', error);
      setError('Failed to resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RedirectIfAuthenticated>
      <main className={styles.authPage}>
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div 
              key="success"
              className={styles.authContainer}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.authHeader}>
                <SafeImage src="/images/logo.png" alt="PattiBytes" width={60} height={60} className={styles.logo} />
                <h1>Check Your Email</h1>
                <p>We sent a password reset link to {email}</p>
              </div>

              <motion.div className={styles.authCard}>
                <div className={styles.successMessage}>
                  <FaCheckCircle className={styles.successIcon} />
                  <p>Click the link in your email to reset your password. The link will expire in 1 hour.</p>
                </div>

                <div className={styles.authActions}>
                  <button 
                    onClick={handleResend}
                    disabled={countdown > 0 || loading}
                    className={styles.secondaryBtn}
                  >
                    {loading ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
                  </button>
                  
                  <Link href="/auth/login" className={styles.submitBtn}>
                    Back to Login
                  </Link>
                </div>

                {error && <div className={styles.error}>{error}</div>}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              className={styles.authContainer}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.authHeader}>
                <SafeImage src="/images/logo.png" alt="PattiBytes" width={60} height={60} className={styles.logo} />
                <h1>Reset Password</h1>
                <p>Enter your email to receive a reset link</p>
              </div>

              <motion.div className={styles.authCard}>
                <form onSubmit={handleSubmit} className={styles.authForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="email"><FaEnvelope /> Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>

                  {error && <div className={styles.error}>{error}</div>}
                </form>

                <Link href="/auth/login" className={styles.backLink}>
                  <FaArrowLeft /> Back to Login
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </RedirectIfAuthenticated>
  );
}
