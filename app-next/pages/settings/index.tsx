// app-next/pages/settings/index.tsx - COMPLETE WITH ALL FEATURES
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import UsernameField from '@/components/UsernameField';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { updateUserProfile, claimUsername } from '@/lib/username';
import { signOut } from 'firebase/auth';
import { getFirebaseClient } from '@/lib/firebase';
import { motion } from 'framer-motion';
import {
  FaSave,
  FaUser,
  FaAt,
  FaBell,
  FaSignOutAlt,
  FaTrash,
  FaShieldAlt,
  FaInfoCircle,
} from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';
import { toast } from 'react-hot-toast';

type ThemePref = 'light' | 'dark' | 'auto';
type LanguagePref = 'en' | 'pa';

export default function SettingsPage() {
  const router = useRouter();
  const { user, userProfile, reloadUser } = useAuth();
  const { auth } = getFirebaseClient();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [username, setUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [publicProfile, setPublicProfile] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<ThemePref>('auto');
  const [language, setLanguage] = useState<LanguagePref>('en');

  // Delete account confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Track whether user is actively editing to prevent form resets
  const isEditingRef = useRef(false);
  const previousProfileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    // Serialize profile to detect changes
    const profileKey = JSON.stringify({
      username: userProfile.username,
      displayName: userProfile.displayName,
      bio: userProfile.bio,
      website: userProfile.website,
      location: userProfile.location,
      preferences: userProfile.preferences,
    });

    // If profile changed (refresh or reloadUser), update form
    // But only if user is not actively typing/editing
    if (previousProfileRef.current !== profileKey && !isEditingRef.current) {
      setDisplayName(userProfile.displayName || '');
      setBio(userProfile.bio || '');
      setWebsite(userProfile.website || '');
      setLocation(userProfile.location || '');
      setUsername(userProfile.username || '');

      const prefs = userProfile.preferences || {};
      setPublicProfile(prefs.publicProfile ?? true);
      setNotifications(prefs.notifications ?? true);
      setTheme((prefs.theme as ThemePref) || 'auto');
      setLanguage((prefs.language as LanguagePref) || 'en');
    }

    previousProfileRef.current = profileKey;
  }, [userProfile]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const nameToSave = displayName.trim();
    if (!nameToSave) {
      toast.error('Display name is required');
      return;
    }

    try {
      setSavingProfile(true);
      await updateUserProfile(user.uid, {
        displayName: nameToSave,
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
      isEditingRef.current = false;
      toast.success('Profile updated successfully! ✅');
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
      isEditingRef.current = false;
      toast.success('Username updated successfully! ✅');
    } catch (err) {
      console.error('Username update error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to update username',
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      toast.success('Logged out successfully!');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    // This would require additional backend logic
    toast.error('Account deletion is not yet implemented. Contact support.');
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
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
                      toast.success('Photo updated! ✅');
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
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setDisplayName(e.target.value);
                    }}
                    maxLength={50}
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div className={styles.row}>
                <label className={styles.label}>Bio</label>
                <textarea
                  className={styles.textarea}
                  value={bio}
                  onChange={(e) => {
                    isEditingRef.current = true;
                    setBio(e.target.value);
                  }}
                  maxLength={160}
                  rows={3}
                  placeholder="Tell us about yourself…"
                />
                <small className={styles.hint}>{bio.length}/160</small>
              </div>

              <div className={styles.grid2}>
                <div className={styles.row}>
                  <label className={styles.label}>Website</label>
                  <input
                    className={styles.input}
                    value={website}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setWebsite(e.target.value);
                    }}
                    placeholder="https://example.com"
                    type="url"
                  />
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>Location</label>
                  <input
                    className={styles.input}
                    value={location}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setLocation(e.target.value);
                    }}
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
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setTheme(e.target.value as ThemePref);
                    }}
                  >
                    <option value="auto">🌓 Auto (System)</option>
                    <option value="light">☀️ Light</option>
                    <option value="dark">🌙 Dark</option>
                  </select>
                </div>
                <div className={styles.row}>
                  <label className={styles.label}>Language</label>
                  <select
                    className={styles.select}
                    value={language}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setLanguage(e.target.value as LanguagePref);
                    }}
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="pa">🇮🇳 Punjabi</option>
                  </select>
                </div>
              </div>

              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setPublicProfile(e.target.checked);
                    }}
                    className={styles.checkbox}
                  />
                  <span className={styles.toggleText}>
                    <strong>Public Profile</strong>
                    <small>Make your profile visible to everyone</small>
                  </span>
                </label>
              </div>

              <div className={styles.toggleRow}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => {
                      isEditingRef.current = true;
                      setNotifications(e.target.checked);
                    }}
                    className={styles.checkbox}
                  />
                  <span className={styles.toggleText}>
                    <strong>Notifications</strong>
                    <small>Receive updates and alerts</small>
                  </span>
                </label>
              </div>

              <motion.button
                className={styles.primary}
                type="submit"
                disabled={savingProfile}
                whileTap={{ scale: 0.98 }}
              >
                <FaSave /> {savingProfile ? 'Saving…' : 'Save Profile'}
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
                onChange={(val) => {
                  isEditingRef.current = true;
                  setUsername(val);
                }}
                excludeCurrent={userProfile?.username}
                showSuggestions
              />
              <motion.button
                className={styles.primary}
                type="submit"
                disabled={savingUsername}
                whileTap={{ scale: 0.98 }}
              >
                <FaSave /> {savingUsername ? 'Updating…' : 'Update Username'}
              </motion.button>
            </form>
          </motion.div>

          {/* Account Info */}
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className={styles.cardHeader}>
              <FaInfoCircle className={styles.cardIcon} />
              <h2>Account Information</h2>
            </div>
            <div className={styles.form}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <strong>Email:</strong>
                  <span>{user?.email || 'Not set'}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>User ID:</strong>
                  <span className={styles.uid}>{user?.uid}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Account Created:</strong>
                  <span>
                    {user?.metadata?.creationTime
                      ? new Date(user.metadata.creationTime).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Last Sign In:</strong>
                  <span>
                    {user?.metadata?.lastSignInTime
                      ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security & Actions */}
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className={styles.cardHeader}>
              <FaShieldAlt className={styles.cardIcon} />
              <h2>Security & Actions</h2>
            </div>
            <div className={styles.form}>
              <div className={styles.actionButtons}>
                <motion.button
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                  disabled={loggingOut}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                >
                  <FaSignOutAlt />
                  {loggingOut ? 'Logging out...' : 'Sign Out'}
                </motion.button>

                <motion.button
                  className={styles.dangerBtn}
                  onClick={() => setShowDeleteConfirm(true)}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                >
                  <FaTrash />
                  Delete Account
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <div className={styles.cardHeader}>
              <FaBell className={styles.cardIcon} />
              <h2>💡 Tips</h2>
            </div>
            <div className={styles.form}>
              <ul className={styles.tipsList}>
                <li>Keep your profile up to date for better connections</li>
                <li>Choose a unique username that represents you</li>
                <li>Enable notifications to stay updated</li>
                <li>Make your profile public to increase visibility</li>
                <li>Add a bio to tell others about yourself</li>
              </ul>
            </div>
          </motion.div>

          {/* Delete Account Confirmation Modal */}
          {showDeleteConfirm && (
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className={styles.modalContent}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                <h2>⚠️ Delete Account</h2>
                <p className={styles.warningText}>
                  This action is permanent and cannot be undone. All your data,
                  posts, and information will be permanently deleted.
                </p>
                <div className={styles.confirmInput}>
                  <label>Type DELETE to confirm:</label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className={styles.input}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className={styles.confirmDeleteBtn}
                    disabled={deleteConfirmText !== 'DELETE'}
                  >
                    Delete My Account
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
