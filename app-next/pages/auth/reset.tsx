import { FormEvent, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import Image from 'next/image';
import { RedirectIfAuthenticated } from '@/components/AuthGuard';
import { motion } from 'framer-motion';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

interface WindowWithGtag extends Window {
  gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
}

export default function ResetPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Auto-focus email input
  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput && !success) {
      emailInput.focus();
    }
  }, [success]);

  // Countdown timer for resend button
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

    try {
      await sendPasswordReset(email);
      setSuccess(true);
      setCountdown(60); // 1 minute cooldown
      
      // Analytics event
      if (typeof window !== 'undefined') {
        const windowWithGtag = window as WindowWithGtag;
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'password_reset_requested');
        }
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
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
      } else {
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
    
    try {
      await sendPasswordReset(email);
      setCountdown(60);
    } catch (error) {
      console.error('Failed to resend email:', error);
      setError('Failed to resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <Image
                  src="/images/logo.png"
                  alt="PattiBytes"
                  width={60}
                  height={60}
                  className={styles.logo}
                />
              </motion.div>
              
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Check Your Email
              </motion.h1>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                We sent a password reset link to {email}
              </motion.p>
            </div>

            <motion.div 
              className={styles.authCard}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className={styles.successMessage}>
                <motion.div 
                  className={styles.successIcon}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                >
                  <FaCheckCircle />
                </motion.div>
                <p>
                  Check your email and click the link to reset your password. 
                  The link will expire in 1 hour.
                </p>
              </div>

              <div className={styles.authActions}>
                <button 
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className={styles.resendBtn}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    'Resend Email'
                  )}
                </button>
                
                <button 
                  onClick={() => setSuccess(false)}
                  className={styles.secondaryBtn}
                  disabled={loading}
                >
                  Try Different Email
                </button>
                
                <Link href="/auth/login" className={styles.primaryBtn}>
                  Back to Login
                </Link>
              </div>

              {error && (
                <motion.div 
                  className={styles.error}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </main>
      </RedirectIfAuthenticated>
    );
  }

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
              <Image
                src="/images/logo.png"
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
              Reset Password
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Enter your email to receive a reset link
            </motion.p>
          </div>

          <motion.div 
            className={styles.authCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <form onSubmit={handleSubmit} className={styles.authForm}>
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
                />
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
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
              <Link href="/auth/login" className={styles.backLink}>
                <FaArrowLeft />
                Back to Login
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </RedirectIfAuthenticated>
  );
}
