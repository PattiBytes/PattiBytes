import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSave } from 'react-icons/fa';
import styles from '@/styles/UserProfileEdit.module.css';

interface FormData {
  displayName: string;
  bio: string;
  website: string;
  location: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    youtube: string;
  };
  preferences: {
    publicProfile: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export default function MyProfile() {
  const { user, userProfile, reloadUser } = useAuth();
  const { db, auth } = getFirebaseClient();

  const [form, setForm] = useState<FormData>({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    website: userProfile?.website || '',
    location: userProfile?.location || '',
    socialLinks: {
      twitter: userProfile?.socialLinks?.twitter || '',
      instagram: userProfile?.socialLinks?.instagram || '',
      youtube: userProfile?.socialLinks?.youtube || ''
    },
    preferences: {
      publicProfile: userProfile?.preferences?.publicProfile ?? true,
      theme: (userProfile?.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto'
    }
  });

  const [photoURL, setPhotoURL] = useState<string | undefined>(userProfile?.photoURL);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setForm({
      displayName: userProfile?.displayName || '',
      bio: userProfile?.bio || '',
      website: userProfile?.website || '',
      location: userProfile?.location || '',
      socialLinks: {
        twitter: userProfile?.socialLinks?.twitter || '',
        instagram: userProfile?.socialLinks?.instagram || '',
        youtube: userProfile?.socialLinks?.youtube || ''
      },
      preferences: {
        publicProfile: userProfile?.preferences?.publicProfile ?? true,
        theme: (userProfile?.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto'
      }
    });
    setPhotoURL(userProfile?.photoURL);
  }, [
    userProfile?.displayName,
    userProfile?.bio,
    userProfile?.website,
    userProfile?.location,
    userProfile?.socialLinks?.twitter,
    userProfile?.socialLinks?.instagram,
    userProfile?.socialLinks?.youtube,
    userProfile?.preferences?.publicProfile,
    userProfile?.preferences?.theme,
    userProfile?.photoURL
  ]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveProfile = async () => {
    if (!db || !user?.uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        website: form.website.trim(),
        location: form.location.trim(),
        socialLinks: {
          twitter: form.socialLinks.twitter.trim(),
          instagram: form.socialLinks.instagram.trim(),
          youtube: form.socialLinks.youtube.trim()
        },
        preferences: {
          publicProfile: !!form.preferences.publicProfile,
          theme: form.preferences.theme
        },
        photoURL: photoURL || null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (auth?.currentUser) {
        if (form.displayName.trim() && auth.currentUser.displayName !== form.displayName.trim()) {
          await updateAuthProfile(auth.currentUser, { displayName: form.displayName.trim() });
        }
      }
      showMessage('success', 'Profile updated');
      await reloadUser?.();
    } catch (e) {
      console.error('Save profile error:', e);
      showMessage('error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="My Profile - PattiBytes">
        <div className={styles.page}>
          <div className={styles.header}>
            <h1>Edit Profile</h1>
          </div>

          <div className={styles.card}>
            <div className={styles.avatarRow}>
              <ProfilePictureUpload
                currentUrl={photoURL}
                onUploaded={(url) => setPhotoURL(url)}
              />
              <div className={styles.nameBlock}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  maxLength={50}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  maxLength={160}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Website</label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Twitter</label>
                <input
                  type="text"
                  value={form.socialLinks.twitter}
                  onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                  placeholder="username"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Instagram</label>
                <input
                  type="text"
                  value={form.socialLinks.instagram}
                  onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })}
                  placeholder="username"
                />
              </div>

              <div className={styles.formGroup}>
                <label>YouTube</label>
                <input
                  type="text"
                  value={form.socialLinks.youtube}
                  onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, youtube: e.target.value } })}
                  placeholder="channel"
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.saveBtn} onClick={saveProfile} disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                className={`${styles.message} ${styles[message.type]}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    </AuthGuard>
  );
}
