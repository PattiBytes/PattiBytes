import { FormEvent, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import SafeImage from '@/components/SafeImage';
import {
  checkUsernameAvailable,
  claimUsername,
  validateUsername,
  getUsernameSuggestions
} from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

export default function SetupUsername() {
  const { user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean | null; checking: boolean; error?: string }>({
    available: null,
    checking: false
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && (user.displayName || user.email)) {
      const baseName = user.displayName || (user.email ? user.email.split('@')[0] : '');
      if (baseName) {
        const newSuggestions = getUsernameSuggestions(baseName, 5);
        setSuggestions(newSuggestions);
      }
    }
  }, [user]);

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

      router.push('/dashboard');
    } catch (error) {
      console.error('Username claim error:', error);
      setError(error instanceof Error ? error.message : 'Failed to set username');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <main className={styles.authPage}>
        <motion.div className={styles.authContainer}>
          <div className={styles.authHeader}>
            <SafeImage src="/images/logo.png" alt="PattiBytes" width={60} height={60} className={styles.logo} />
            <h1>Choose Username</h1>
            <p>Pick a unique username for your account</p>

            {user && (
              <div className={styles.userInfo}>
                <SafeImage
                  src={user.photoURL || '/images/logo.png'}
                  alt="Profile"
                  width={40}
                  height={40}
                  className={styles.profilePic}
                />
                <span>Welcome, {user.displayName || 'User'}!</span>
              </div>
            )}
          </div>

          <motion.div className={styles.authCard}>
            <form onSubmit={handleSubmit} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="username"><FaUser /> Username</label>
                <div className={styles.usernameWrapper}>
                  <input
                    id="username"
                    type="text"
                    placeholder="unique_username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <div className={styles.usernameStatus}>
                    {usernameStatus.checking && <FaSpinner className={styles.spinning} />}
                    {!usernameStatus.checking && usernameStatus.available === true && <FaCheck className={styles.available} />}
                    {!usernameStatus.checking && (usernameStatus.available === false || usernameStatus.error) && <FaTimes className={styles.taken} />}
                  </div>
                </div>

                {usernameStatus.error && <span className={styles.fieldError}>{usernameStatus.error}</span>}
                <small>3-20 characters, letters, numbers, and underscores only</small>

                <AnimatePresence>
                  {suggestions.length > 0 && username.length < 3 && (
                    <motion.div className={styles.suggestions}>
                      <span>Suggestions:</span>
                      <div className={styles.suggestionTags}>
                        {suggestions.map(s => (
                          <button key={s} type="button" onClick={() => setUsername(s)} disabled={loading}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading || usernameStatus.available !== true}>
                {loading ? 'Setting username...' : 'Continue to PattiBytes'}
              </button>

              {error && <div className={styles.error}>{error}</div>}
            </form>
          </motion.div>
        </motion.div>
      </main>
    </AuthGuard>
  );
}
