import { useEffect, useRef, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import UsernameField from '@/components/UsernameField';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { updateUserProfile, claimUsername } from '@/lib/username';
import { motion } from 'framer-motion';
import { FaSave, FaUser, FaAt, FaBell } from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';
import { toast } from 'react-hot-toast';

type ThemePref = 'light' | 'dark' | 'auto';
type LanguagePref = 'en' | 'pa';

export default function SettingsPage() {
  const { user, userProfile, reloadUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [username, setUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  const [publicProfile, setPublicProfile] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<ThemePref>('auto');
  const [language, setLanguage] = useState<LanguagePref>('en');

  // Prevent re-initializing form fields every time userProfile changes
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userProfile) return;

    // One-time initialization for other fields
    if (!initializedRef.current) {
      initializedRef.current = true;

      setDisplayName(userProfile.displayName || '');
      setBio(userProfile.bio || '');
      setWebsite(userProfile.website || '');
      setLocation(userProfile.location || '');

      const prefs = userProfile.preferences || {};
      setPublicProfile(prefs.publicProfile ?? true);
      setNotifications(prefs.notifications ?? true);
      setTheme((prefs.theme as ThemePref) || 'auto');
      setLanguage((prefs.language as LanguagePref) || 'en');
    }

    // Always keep username in sync with latest profile
    setUsername(userProfile.username || '');
  }, [userProfile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingProfile(true);
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        location: location.trim(),
        preferences: {
          publicProfile,
          notifications,
          theme,
          language,
        },
      });
      await reloadUser();
      toast.success('Profile updated!');
    } catch (e) {
      console.error('Profile update error:', e);
      toast.error(
        e instanceof Error ? e.message : 'Failed to update profile',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newUser = username.trim().toLowerCase();
    if (!newUser) {
      toast.error('Username required');
      return;
    }
    if (newUser === userProfile?.username) {
      toast('No changes to username');
      return;
    }

    try {
      setSavingUsername(true);
      await claimUsername(newUser, user.uid, {
        displayName: displayName.trim() || userProfile?.displayName,
        photoURL: userProfile?.photoURL,
      });
      await reloadUser();
      toast.success('Username updated!');
    } catch (err) {
      console.error('Username update error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to update username',
      );
    } finally {
      setSavingUsername(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Settings - PattiBytes">
        <div className={styles.page}>
          <div className={styles.header}>
            <h1>Settings</h1>
            <p>Manage your account settings and preferences</p>
          </div>

          {/* Profile Settings */}
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.cardHeader}>
              <FaUser className={styles.cardIcon} />
              <h2>Profile Information</h2>
            </div>

            <form onSubmit={saveProfile} className={styles.form}>
              <div className={styles.avatarRow}>
                <ProfilePictureUpload
                  currentUrl={userProfile?.photoURL}
                  onUploaded={async (url) => {
                    if (!user) return;
                    try {
                      await updateUserProfile(user.uid, {
                        photoURL: url,
                      });
                      await reloadUser();
                      toast.success('Photo updated!');
                    } catch {
                      toast.error('Failed to update photo');
                    }
                  }}
                  maxSizeMB={5}
                />
                <div className={styles.nameBlock}>
                  <label className={styles.label}>Display name</label>
                  <input
                    className={styles.input}
                    value={displayName}
                    onChange={(e) =>
                      setDisplayName(e.target.value)
                    }
                    maxLength={50}
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className={styles.row}>
                <label className={styles.label}>Bio</label>
                <textarea
                  className={styles.textarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="Tell us about yourself…"
                />
                <small className={styles.hint}>
                  {bio.length}/160
                </small>
              </div>

              <div className={styles.grid2}>
                <div className={styles.row}>
                  <label className={styles.label}>Website</label>
                  <input
                    className={styles.input}
                    value={website}
                    onChange={(e) =>
                      setWebsite(e.target.value)
                    }
                    placeholder="https://example.com"
                  />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>Location</label>
                  <input
                    className={styles.input}
                    value={location}
                    onChange={(e) =>
                      setLocation(e.target.value)
                    }
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.row}>
                  <label className={styles.label}>Theme</label>
                  <select
                    className={styles.select}
                    value={theme}
                    onChange={(e) =>
                      setTheme(e.target.value as ThemePref)
                    }
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>Language</label>
                  <select
                    className={styles.select}
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value as LanguagePref)
                    }
                  >
                    <option value="en">English</option>
                    <option value="pa">Punjabi</option>
                  </select>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) =>
                      setPublicProfile(e.target.checked)
                    }
                    className={styles.checkbox}
                  />
                  <span className={styles.toggleText}>
                    <strong>Public Profile</strong>
                    <small>
                      Make your profile visible to everyone
                    </small>
                  </span>
                </label>
              </div>

              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) =>
                      setNotifications(e.target.checked)
                    }
                    className={styles.checkbox}
                  />
                  <span className={styles.toggleText}>
                    <strong>Notifications</strong>
                    <small>Receive updates</small>
                  </span>
                </label>
              </div>

              <motion.button
                className={styles.primary}
                type="submit"
                disabled={savingProfile}
                whileTap={{ scale: 0.98 }}
              >
                <FaSave />{' '}
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </motion.button>
            </form>
          </motion.div>

          {/* Username Settings */}
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className={styles.cardHeader}>
              <FaAt className={styles.cardIcon} />
              <h2>Username</h2>
            </div>

            <form onSubmit={saveUsername} className={styles.form}>
              <UsernameField
                value={username}
                onChange={setUsername}
                excludeCurrent={userProfile?.username}
                showSuggestions
              />
              <motion.button
                className={styles.primary}
                type="submit"
                disabled={savingUsername}
                whileTap={{ scale: 0.98 }}
              >
                <FaSave />{' '}
                {savingUsername ? 'Updating…' : 'Update Username'}
              </motion.button>
            </form>
          </motion.div>

          {/* Info */}
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className={styles.cardHeader}>
              <FaBell className={styles.cardIcon} />
              <h2>Tips</h2>
            </div>
            <div className={styles.form}>
              <p>
                Set preferences and notifications as per profile
                needs. These settings are used across the app.
              </p>
            </div>
          </motion.div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
