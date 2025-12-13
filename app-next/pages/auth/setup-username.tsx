import { FormEvent, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import SafeImage from '@/components/SafeImage';
import {
  checkUsernameAvailable,
  claimUsername,
  validateUsername,
  getUsernameSuggestions
} from '@/lib/username';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaCheck, FaTimes, FaSpinner, FaArrowRight } from 'react-icons/fa';
import styles from '@/styles/SetupUsername.module.css';

export default function SetupUsername() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ 
    available: boolean | null; 
    checking: boolean; 
    error?: string 
  }>({
    available: null,
    checking: false
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'welcome' | 'input'>('welcome');

  // Redirect if username already set
  useEffect(() => {
    if (!authLoading && user && userProfile?.username) {
      router.replace('/dashboard');
    }
  }, [user, userProfile, authLoading, router]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.displayName || user.email)) {
      const baseName = user.displayName || (user.email ? user.email.split('@')[0] : '');
      if (baseName) {
        const newSuggestions = getUsernameSuggestions(baseName, 5);
        setSuggestions(newSuggestions);
      }
    }
  }, [user]);

  // Debounced username check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus({ available: null, checking: false });
      return;
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameStatus({ available: false, checking: false, error: validation.error });
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
      } catch (error) {
        console.error('Username check error:', error);
        setUsernameStatus({
          available: false,
          checking: false,
          error: 'Unable to check username availability'
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || usernameStatus.available !== true) return;

    setLoading(true);
    setError(null);

    try {
      await claimUsername(username, user.uid, {
        email: user.email!,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        photoURL: user.photoURL || undefined
      });

      router.replace('/auth/complete-profile?next=' + encodeURIComponent('/dashboard'));
      
    } catch (error) {
      console.error('Username claim error:', error);
      setError(error instanceof Error ? error.message : 'Failed to set username');
      setLoading(false);
    }
  };

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setUsername(suggestion);
    setStep('input');
  }, []);

  if (authLoading || !user || userProfile?.username) {
    return null;
  }

  return (
    <main className={styles.page}>
      <AnimatePresence mode="wait">
        {step === 'welcome' ? (
          <motion.div 
            key="welcome"
            className={styles.welcomeScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className={styles.welcomeContent}
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <SafeImage 
                src="/images/logo.png" 
                alt="PattiBytes" 
                width={80} 
                height={80} 
                className={styles.logo} 
              />
              
              <h1>Welcome to PattiBytes!</h1>
              <p>Let&apos;s get you set up with a unique username</p>

              {user && (
                <div className={styles.userCard}>
                  <SafeImage
                    src={user.photoURL}
                    alt="Profile"
                    width={60}
                    height={60}
                    className={styles.profilePic}
                  />
                  <div>
                    <h3>{user.displayName || 'User'}</h3>
                    <p>{user.email}</p>
                  </div>
                </div>
              )}

              <motion.button 
                onClick={() => setStep('input')}
                className={styles.startBtn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started <FaArrowRight />
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="input"
            className={styles.inputScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.inputContent}>
              <button 
                onClick={() => setStep('welcome')}
                className={styles.backBtn}
              >
                ← Back
              </button>

              <SafeImage 
                src="/images/logo.png" 
                alt="PattiBytes" 
                width={60} 
                height={60} 
                className={styles.logoSmall} 
              />

              <h2>Choose Your Username</h2>
              <p>This will be your unique identity on PattiBytes</p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <FaUser className={styles.inputIcon} />
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      required
                      disabled={loading}
                      autoFocus
                      autoComplete="off"
                    />
                    <div className={styles.statusIcon}>
                      <AnimatePresence mode="wait">
                        {usernameStatus.checking && (
                          <motion.div
                            key="checking"
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{ opacity: 1, rotate: 360 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                          >
                            <FaSpinner className={styles.checking} />
                          </motion.div>
                        )}
                        {!usernameStatus.checking && usernameStatus.available === true && (
                          <motion.div
                            key="available"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <FaCheck className={styles.available} />
                          </motion.div>
                        )}
                        {!usernameStatus.checking && (usernameStatus.available === false || usernameStatus.error) && (
                          <motion.div
                            key="taken"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <FaTimes className={styles.taken} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <AnimatePresence>
                    {usernameStatus.error && (
                      <motion.span 
                        className={styles.error}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {usernameStatus.error}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <small className={styles.hint}>
                    3-20 characters • Letters, numbers, and underscores
                  </small>
                </div>

                <AnimatePresence>
                  {suggestions.length > 0 && username.length < 3 && (
                    <motion.div 
                      className={styles.suggestions}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <span className={styles.suggestionsLabel}>Suggestions:</span>
                      <div className={styles.suggestionTags}>
                        {suggestions.map(s => (
                          <motion.button 
                            key={s} 
                            type="button" 
                            onClick={() => handleSuggestionClick(s)}
                            disabled={loading}
                            className={styles.suggestionTag}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {s}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button 
                  type="submit" 
                  className={styles.submitBtn} 
                  disabled={loading || usernameStatus.available !== true}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? (
                    <>
                      <FaSpinner className={styles.spinning} /> Setting up...
                    </>
                  ) : (
                    <>
                      Continue <FaArrowRight />
                    </>
                  )}
                </motion.button>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      className={styles.errorBox}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
