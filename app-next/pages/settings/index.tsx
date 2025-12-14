import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import UsernameField from '@/components/UsernameField';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { updateUserProfile, claimUsername } from '@/lib/username';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSave,
  FaUser,
  FaAt,
  FaBell,
  FaSignOutAlt,
  FaTrash,
  FaShieldAlt,
  FaInfoCircle,
  FaDownload,
  FaEye,
  FaEyeSlash,
  FaToggleOn,
} from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';
import { toast } from 'react-hot-toast';

type ThemePref = 'light' | 'dark' | 'auto';
type LanguagePref = 'en' | 'pa';
type TabKey = 'profile' | 'username' | 'privacy' | 'preferences' | 'security' | 'about';

export default function SettingsPage() {
  const router = useRouter();
  const { user, userProfile, reloadUser, signOut } = useAuth();
  const uid = user?.uid;

  const [tab, setTab] = useState<TabKey>('profile');

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');

  // Username
  const [username, setUsername] = useState('');

  // Preferences / privacy
  const [publicProfile, setPublicProfile] = useState(true);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [allowSearchIndexing, setAllowSearchIndexing] = useState(true);
  const [allowDMs, setAllowDMs] = useState(true);
  const [allowComments, setAllowComments] = useState(true);

  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<ThemePref>('auto');
  const [language, setLanguage] = useState<LanguagePref>('en');

  // Busy
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Avoid resetting while typing
  const isEditingRef = useRef(false);
  const previousProfileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const profileKey = JSON.stringify({
      username: userProfile.username,
      displayName: userProfile.displayName,
      bio: userProfile.bio,
      website: userProfile.website,
      location: userProfile.location,
      preferences: userProfile.preferences,
      photoURL: userProfile.photoURL,
    });

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

      setShowActivityStatus(prefs.showActivityStatus ?? true);
      setAllowSearchIndexing(prefs.allowSearchIndexing ?? true);
      setAllowDMs(prefs.allowDMs ?? true);
      setAllowComments(prefs.allowComments ?? true);
    }

    previousProfileRef.current = profileKey;
  }, [userProfile]);

  const markEditing = () => {
    isEditingRef.current = true;
  };

  const profileDirty = useMemo(() => {
    if (!userProfile) return false;
    return (
      displayName !== (userProfile.displayName || '') ||
      bio !== (userProfile.bio || '') ||
      website !== (userProfile.website || '') ||
      location !== (userProfile.location || '')
    );
  }, [displayName, bio, website, location, userProfile]);

  const prefsDirty = useMemo(() => {
    const prefs = userProfile?.preferences || {};
    return (
      (prefs.publicProfile ?? true) !== publicProfile ||
      (prefs.notifications ?? true) !== notifications ||
      (prefs.theme ?? 'auto') !== theme ||
      (prefs.language ?? 'en') !== language ||
      (prefs.showActivityStatus ?? true) !== showActivityStatus ||
      (prefs.allowSearchIndexing ?? true) !== allowSearchIndexing ||
      (prefs.allowDMs ?? true) !== allowDMs ||
      (prefs.allowComments ?? true) !== allowComments
    );
  }, [
    userProfile,
    publicProfile,
    notifications,
    theme,
    language,
    showActivityStatus,
    allowSearchIndexing,
    allowDMs,
    allowComments,
  ]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    const nameToSave = displayName.trim();
    if (!nameToSave) {
      toast.error('Display name is required');
      return;
    }

    try {
      setSavingProfile(true);
      await updateUserProfile(uid, {
        displayName: nameToSave,
        bio: bio.trim(),
        website: website.trim(),
        location: location.trim(),
      });

      await reloadUser();
      isEditingRef.current = false;
      toast.success('Profile saved');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    try {
      setSavingPrefs(true);
      await updateUserProfile(uid, {
        preferences: {
          publicProfile,
          notifications,
          theme,
          language,
          showActivityStatus,
          allowSearchIndexing,
          allowDMs,
          allowComments,
        },
      });

      await reloadUser();
      isEditingRef.current = false;
      toast.success('Preferences saved');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

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
      await claimUsername(newUser, uid, {
        displayName: displayName.trim() || userProfile?.displayName,
        photoURL: userProfile?.photoURL,
        email: user?.email || userProfile?.email,
      });
      await reloadUser();
      isEditingRef.current = false;
      toast.success('Username updated');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      toast.success('Signed out');
      router.replace('/auth/login');
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign out');
      setLoggingOut(false);
    }
  };

  const exportMyData = () => {
    if (!user || !userProfile) {
      toast.error('Profile not loaded yet');
      return;
    }

    const data = {
      exportedAt: new Date().toISOString(),
      auth: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        metadata: user.metadata,
        providerData: user.providerData?.map((p) => ({
          providerId: p.providerId,
          uid: p.uid,
          email: p.email,
          displayName: p.displayName,
          photoURL: p.photoURL,
        })),
      },
      profile: userProfile,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattibytes-account-export-${user.uid}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Export downloaded');
  };

  const expectedDeletePhrase = `DELETE ${userProfile?.username || user?.uid || ''}`;

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteConfirmText.trim() !== expectedDeletePhrase) {
      toast.error(`Type: ${expectedDeletePhrase}`);
      return;
    }

    try {
      setDeleting(true);
      const token = await user.getIdToken(true);

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleteUserContent: true }),
      });

      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || 'Delete failed');
      }

      toast.success('Account deleted');
      router.replace('/auth/login');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <FaUser /> },
    { key: 'username', label: 'Username', icon: <FaAt /> },
    { key: 'privacy', label: 'Privacy', icon: <FaEye /> },
    { key: 'preferences', label: 'Preferences', icon: <FaBell /> },
    { key: 'security', label: 'Security', icon: <FaShieldAlt /> },
    { key: 'about', label: 'About', icon: <FaInfoCircle /> },
  ];

  const ProfileTab = (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.cardHeader}>
        <FaUser className={styles.cardIcon} />
        <div className={styles.cardTitleRow}>
          <h2>Profile</h2>
          {profileDirty && <span className={styles.badge}>Unsaved</span>}
        </div>
      </div>

      <form onSubmit={saveProfile} className={styles.form}>
        <div className={styles.avatarRow}>
          <ProfilePictureUpload
            currentUrl={userProfile?.photoURL}
            onUploaded={async (url) => {
              if (!uid) return;
              try {
                await updateUserProfile(uid, { photoURL: url });
                await reloadUser();
                toast.success('Photo updated');
              } catch (err) {
                console.error(err);
                toast.error('Failed to update photo');
              }
            }}
            maxSizeMB={5}
          />

          <div className={styles.nameBlock}>
            <label className={styles.label}>Display name *</label>
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => {
                markEditing();
                setDisplayName(e.target.value);
              }}
              maxLength={50}
              required
              placeholder="Your name"
            />
            <small className={styles.hint}>{displayName.length}/50</small>
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>Bio</label>
          <textarea
            className={styles.textarea}
            value={bio}
            onChange={(e) => {
              markEditing();
              setBio(e.target.value);
            }}
            maxLength={160}
            rows={3}
            placeholder="Tell people about yourself…"
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
                markEditing();
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
                markEditing();
                setLocation(e.target.value);
              }}
              placeholder="City, Country"
            />
          </div>
        </div>

        <motion.button className={styles.primary} type="submit" disabled={savingProfile} whileTap={{ scale: 0.98 }}>
          <FaSave /> {savingProfile ? 'Saving…' : 'Save Profile'}
        </motion.button>
      </form>
    </motion.div>
  );

  const UsernameTab = (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.cardHeader}>
        <FaAt className={styles.cardIcon} />
        <h2>Username</h2>
      </div>

      <form onSubmit={saveUsername} className={styles.form}>
        <UsernameField
          value={username}
          onChange={(val) => {
            markEditing();
            setUsername(val);
          }}
          excludeCurrent={userProfile?.username}
          showSuggestions
        />

        <motion.button className={styles.primary} type="submit" disabled={savingUsername} whileTap={{ scale: 0.98 }}>
          <FaSave /> {savingUsername ? 'Updating…' : 'Update Username'}
        </motion.button>
      </form>
    </motion.div>
  );

  const PrivacyTab = (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.cardHeader}>
        <FaShieldAlt className={styles.cardIcon} />
        <div className={styles.cardTitleRow}>
          <h2>Privacy</h2>
          {prefsDirty && <span className={styles.badge}>Unsaved</span>}
        </div>
      </div>

      <form onSubmit={savePreferences} className={styles.form}>
        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={publicProfile}
              onChange={(e) => {
                markEditing();
                setPublicProfile(e.target.checked);
              }}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Public profile</strong>
              <small>{publicProfile ? 'Anyone can view your profile.' : 'Profile is private.'}</small>
            </span>
          </label>
          <span className={publicProfile ? styles.pillOk : styles.pillWarn}>
            {publicProfile ? (
              <>
                <FaEye /> Public
              </>
            ) : (
              <>
                <FaEyeSlash /> Private
              </>
            )}
          </span>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showActivityStatus}
              onChange={(e) => {
                markEditing();
                setShowActivityStatus(e.target.checked);
              }}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Show activity status</strong>
              <small>Show “online/last seen” to others.</small>
            </span>
          </label>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={allowSearchIndexing}
              onChange={(e) => {
                markEditing();
                setAllowSearchIndexing(e.target.checked);
              }}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Allow search discovery</strong>
              <small>Allow your profile to appear in search results.</small>
            </span>
          </label>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={allowDMs}
              onChange={(e) => {
                markEditing();
                setAllowDMs(e.target.checked);
              }}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Allow messages</strong>
              <small>Let other users message you.</small>
            </span>
          </label>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => {
                markEditing();
                setAllowComments(e.target.checked);
              }}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Allow comments</strong>
              <small>Allow others to comment on your posts.</small>
            </span>
          </label>
        </div>

        <motion.button className={styles.primary} type="submit" disabled={savingPrefs} whileTap={{ scale: 0.98 }}>
          <FaSave /> {savingPrefs ? 'Saving…' : 'Save Privacy'}
        </motion.button>
      </form>
    </motion.div>
  );

  const PreferencesTab = (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.cardHeader}>
        <FaToggleOn className={styles.cardIcon} />
        <div className={styles.cardTitleRow}>
          <h2>Preferences</h2>
          {prefsDirty && <span className={styles.badge}>Unsaved</span>}
        </div>
      </div>

      <form onSubmit={savePreferences} className={styles.form}>
        <div className={styles.grid2}>
          <div className={styles.row}>
            <label className={styles.label}>Theme</label>
            <select
              className={styles.select}
              value={theme}
              onChange={(e) => {
                markEditing();
                setTheme(e.target.value as ThemePref);
              }}
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
              onChange={(e) => {
                markEditing();
                setLanguage(e.target.value as LanguagePref);
              }}
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
              checked={notifications}
              onChange={(e) => {
                markEditing();
                setNotifications(e.target.checked);
              }}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Notifications</strong>
              <small>Receive updates and alerts.</small>
            </span>
          </label>
        </div>

        <motion.button className={styles.primary} type="submit" disabled={savingPrefs} whileTap={{ scale: 0.98 }}>
          <FaSave /> {savingPrefs ? 'Saving…' : 'Save Preferences'}
        </motion.button>
      </form>
    </motion.div>
  );

  const SecurityTab = (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.cardHeader}>
        <FaShieldAlt className={styles.cardIcon} />
        <h2>Security & Actions</h2>
      </div>

      <div className={styles.form}>
        <div className={styles.actionButtons}>
          <motion.button className={styles.secondaryBtn} onClick={exportMyData} whileTap={{ scale: 0.98 }} type="button">
            <FaDownload /> Export my data (JSON)
          </motion.button>

          <motion.button
            className={styles.logoutBtn}
            onClick={handleLogout}
            disabled={loggingOut}
            whileTap={{ scale: 0.98 }}
            type="button"
          >
            <FaSignOutAlt /> {loggingOut ? 'Signing out...' : 'Sign Out'}
          </motion.button>
        </div>

        <motion.button className={styles.dangerBtn} onClick={() => setShowDeleteConfirm(true)} whileTap={{ scale: 0.98 }} type="button">
          <FaTrash /> Delete Account
        </motion.button>
      </div>
    </motion.div>
  );

  const AboutTab = (
    <motion.div className={styles.card} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.cardHeader}>
        <FaInfoCircle className={styles.cardIcon} />
        <h2>Account Info</h2>
      </div>

      <div className={styles.form}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <strong>Email</strong>
            <span>{user?.email || 'Not set'}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>User ID</strong>
            <span className={styles.uid}>{user?.uid}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Account created</strong>
            <span>{user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Last sign-in</strong>
            <span>{user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Unknown'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderTab = () => {
    switch (tab) {
      case 'profile':
        return ProfileTab;
      case 'username':
        return UsernameTab;
      case 'privacy':
        return PrivacyTab;
      case 'preferences':
        return PreferencesTab;
      case 'security':
        return SecurityTab;
      case 'about':
        return AboutTab;
      default:
        return ProfileTab;
    }
  };

  return (
    <AuthGuard>
      <Layout title="Settings - PattiBytes">
        <div className={styles.page}>
          <div className={styles.header}>
            <h1>Settings</h1>
            <p>Manage your profile, privacy and security.</p>
          </div>

          <div className={styles.shell}>
            <aside className={styles.sidebar}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ''}`}
                >
                  <span className={styles.tabIcon}>{t.icon}</span>
                  <span className={styles.tabLabel}>{t.label}</span>
                </button>
              ))}
            </aside>

            <section className={styles.content}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderTab()}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>

          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (deleting) return;
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              >
                <motion.div
                  className={styles.modal}
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className={styles.modalTitle}>Delete Account</h2>
                  <p className={styles.warningText}>
                    This is permanent. Your account and related data will be removed.
                  </p>

                  <div className={styles.confirmInput}>
                    <label className={styles.label}>
                      Type <span className={styles.code}>{expectedDeletePhrase}</span> to confirm:
                    </label>
                    <input
                      className={styles.input}
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={expectedDeletePhrase}
                      disabled={deleting}
                    />
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      className={styles.cancelBtn}
                      type="button"
                      onClick={() => {
                        if (deleting) return;
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      disabled={deleting}
                    >
                      Cancel
                    </button>

                    <button
                      className={styles.confirmDeleteBtn}
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirmText.trim() !== expectedDeletePhrase}
                    >
                      {deleting ? 'Deleting…' : 'Delete my account'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    </AuthGuard>
  );
}
