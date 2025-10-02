import { FormEvent, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { 
  checkUsernameAvailable, 
  claimUsername, 
  validateUsername,
  UserProfile,
  getUsernameSuggestions
} from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import styles from '@/styles/Auth.module.css';

interface UsernameStatus {
  available: boolean | null;
  checking: boolean;
  error?: string;
}

interface WindowWithGtag extends Window {
  gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
}

export default function SetupUsername() {
  const { user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({ 
    available: null, 
    checking: false 
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate suggestions when user data is available
  useEffect(() => {
    if (user && (user.displayName || user.email)) {
      const baseName = user.displayName || (user.email ? user.email.split('@')[0] : '');
      if (baseName) {
        const newSuggestions = getUsernameSuggestions(baseName, 5);
        setSuggestions(newSuggestions);
      }
    }
  }, [user]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || usernameStatus.available !== true) return;

    setLoading(true);
    setError(null);

    try {
      // Create user profile with Google user data
      const userProfile: Partial<UserProfile> = {
        email: user.email!,
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        photoURL: user.photoURL || undefined
      };

      await claimUsername(username, user.uid, userProfile);
      
      // Analytics event
      if (typeof window !== 'undefined') {
        const windowWithGtag = window as WindowWithGtag;
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'sign_up', {
            method: 'google',
            custom_event_type: 'username_setup_complete'
          });
        }
      }
      
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to set username:', err);
      setError(err instanceof Error ? err.message : 'Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
  };

  return (
    <AuthGuard>
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
              Choose Username
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Pick a unique username for your account
            </motion.p>
            
            {user && (
              <motion.div 
                className={styles.userInfo}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {user.photoURL && (
                  <Image 
                    src={user.photoURL} 
                    alt="Profile" 
                    width={40}
                    height={40}
                    className={styles.profilePic}
                  />
                )}
                <span>Welcome, {user.displayName || 'User'}!</span>
              </motion.div>
            )}
          </div>

          <motion.div 
            className={styles.authCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <form onSubmit={handleSubmit} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="username">
                  <FaUser />
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
                    autoFocus
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
                      <span>Suggestions based on your profile:</span>
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
                    Setting username...
                  </>
                ) : (
                  'Continue to PattiBytes'
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
          </motion.div>
        </motion.div>
      </main>
    </AuthGuard>
  );
}
