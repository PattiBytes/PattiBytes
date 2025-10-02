import { FormEvent, useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseClient } from '@/lib/firebase';
import { 
  checkUsernameAvailable, 
  claimUsername, 
  validateUsername,
  UserProfile,
  getUsernameSuggestions
} from '@/lib/username';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { RedirectIfAuthenticated } from '@/components/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

interface UsernameStatus {
  available: boolean | null;
  checking: boolean;
  error?: string;
}

interface WindowWithGtag extends Window {
  gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
}

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ 
    available: null, 
    checking: false 
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Calculate password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

  // Generate username suggestions when displayName changes
  useEffect(() => {
    if (displayName) {
      const newSuggestions = getUsernameSuggestions(displayName, 3);
      setSuggestions(newSuggestions);
    }
  }, [displayName]);

  // Debounced username validation
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus({ available: null, checking: false });
      return;
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameStatus({ 
        available: false, 
        checking: false, 
        error: validation.error 
      });
      return;
    }

    setUsernameStatus({ available: null, checking: true });

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        setUsernameStatus({ 
          available, 
          checking: false,
          error: available ? undefined : 'Username is already taken'
        });
      } catch (err) {
        console.error('Username check failed:', err);
        setUsernameStatus({ 
          available: false, 
          checking: false,
          error: 'Unable to check username availability'
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const validateForm = (): string | null => {
    if (!displayName.trim()) return 'Display name is required';
    if (!username.trim()) return 'Username is required';
    
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) return usernameValidation.error!;
    
    if (usernameStatus.available !== true) return 'Please choose an available username';
    if (!email.trim()) return 'Email is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleEmailRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { auth } = getFirebaseClient();

      // Create user account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile with username
      const userProfile: Partial<UserProfile> = {
        email: credential.user.email!,
        displayName: displayName.trim()
      };

      await claimUsername(username, credential.user.uid, userProfile);
      
      // Analytics event
      if (typeof window !== 'undefined') {
        const windowWithGtag = window as WindowWithGtag;
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'sign_up', {
            method: 'email'
          });
        }
      }
      
      router.push('/dashboard');
    } catch (e) {
      if (e instanceof FirebaseError) {
        switch (e.code) {
          case 'auth/email-already-in-use':
            setError('This email is already registered');
            break;
          case 'auth/invalid-email':
            setError('Invalid email address');
            break;
          case 'auth/weak-password':
            setError('Password is too weak');
            break;
          case 'auth/operation-not-allowed':
            setError('Email/password accounts are not enabled');
            break;
          default:
            setError('Registration failed. Please try again.');
        }
      } else {
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
      const { auth, db, googleProvider } = getFirebaseClient();
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user already has profile
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      // Analytics event
      if (typeof window !== 'undefined') {
        const windowWithGtag = window as WindowWithGtag;
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'sign_up', {
            method: 'google'
          });
        }
      }
      
      if (!userDoc.exists() || !userDoc.data()?.username) {
        // New user - redirect to username setup
        router.push('/auth/setup-username');
      } else {
        // Existing user - go to dashboard
        router.push('/dashboard');
      }
    } catch (e) {
      if (e instanceof FirebaseError) {
        switch (e.code) {
          case 'auth/popup-closed-by-user':
            setError('Sign-up was cancelled');
            break;
          case 'auth/popup-blocked':
            setError('Popup was blocked. Please enable popups and try again');
            break;
          case 'auth/account-exists-with-different-credential':
            setError('An account with this email already exists');
            break;
          case 'auth/cancelled-popup-request':
            // User cancelled, don't show error
            break;
          default:
            setError('Google sign-up failed. Please try again.');
        }
      } else {
        setError('Google sign-up failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return '#ef4444';
    if (passwordStrength <= 3) return '#f59e0b';
    return '#10b981';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
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
              ਨਵਾਂ ਖਾਤਾ
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Create your PattiBytes account
            </motion.p>
          </div>

          <motion.div 
            className={styles.authCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {/* Google Sign Up */}
            <button 
              onClick={handleGoogleRegister} 
              className={styles.googleBtn} 
              disabled={loading}
              type="button"
            >
              <FaGoogle />
              {loading ? 'Signing up...' : 'Continue with Google'}
            </button>

            <div className={styles.divider}>
              <span>OR</span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleEmailRegister} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="displayName">
                  <FaUser />
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="Your full name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="username">
                  Username
                </label>
                <div className={styles.usernameWrapper}>
                  <input
                    id="username"
                    type="text"
                    placeholder="unique_username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                  <div className={styles.usernameStatus}>
                    {usernameStatus.checking && <FaSpinner className={styles.spinning} />}
                    {!usernameStatus.checking && usernameStatus.available === true && (
                      <FaCheck className={styles.available} />
                    )}
                    {!usernameStatus.checking && (usernameStatus.available === false || usernameStatus.error) && (
                      <FaTimes className={styles.taken} />
                    )}
                  </div>
                </div>
                
                {usernameStatus.error && (
                  <span className={styles.fieldError}>{usernameStatus.error}</span>
                )}
                
                <small>3-20 characters, letters, numbers, and underscores only</small>
                
                {/* Username Suggestions */}
                <AnimatePresence>
                  {suggestions.length > 0 && username.length < 3 && (
                    <motion.div 
                      className={styles.suggestions}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <span>Suggestions:</span>
                      <div className={styles.suggestionTags}>
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={styles.suggestionTag}
                            disabled={loading}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">
                  <FaEnvelope />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
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
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    autoComplete="new-password"
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
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className={styles.passwordStrength}>
                    <div className={styles.strengthBar}>
                      <div 
                        className={styles.strengthFill}
                        style={{ 
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor()
                        }}
                      />
                    </div>
                    <span style={{ color: getPasswordStrengthColor() }}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">
                  <FaLock />
                  Confirm Password
                </label>
                <div className={styles.passwordInput}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                
                {confirmPassword && password !== confirmPassword && (
                  <span className={styles.fieldError}>Passwords do not match</span>
                )}
              </div>

              <motion.button 
                type="submit" 
                className={styles.submitBtn}
                disabled={loading || usernameStatus.available !== true}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner} />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
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
                Already have an account?{' '}
                <Link href="/auth/login">Log in</Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </RedirectIfAuthenticated>
  );
}
