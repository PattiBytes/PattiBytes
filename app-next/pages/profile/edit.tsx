// app-next/pages/profile/edit.tsx
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { motion } from 'framer-motion';
import {
  FaSave,
  FaUser,
  FaGlobe,
  FaMapMarkerAlt,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaShieldAlt,
  FaPalette,
  FaTimes,
  FaArrowLeft,
} from 'react-icons/fa';
import styles from '@/styles/UserProfileEdit.module.css';
import { toast } from 'react-hot-toast';

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
  const router = useRouter();
  const { user, userProfile, reloadUser } = useAuth();
  const { db, auth } = getFirebaseClient();

  const [form, setForm] = useState<FormData>({
    displayName: '',
    bio: '',
    website: '',
    location: '',
    socialLinks: { twitter: '', instagram: '', youtube: '' },
    preferences: { publicProfile: true, theme: 'auto' },
  });

  const [photoURL, setPhotoURL] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Prevent re-initializing from userProfile every time it changes
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userProfile) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const f: FormData = {
      displayName: userProfile.displayName || '',
      bio: userProfile.bio || '',
      website: userProfile.website || '',
      location: userProfile.location || '',
      socialLinks: {
        twitter: userProfile.socialLinks?.twitter || '',
        instagram: userProfile.socialLinks?.instagram || '',
        youtube: userProfile.socialLinks?.youtube || '',
      },
      preferences: {
        publicProfile:
          userProfile.preferences?.publicProfile ?? true,
        theme:
          (userProfile.preferences?.theme as
            | 'light'
            | 'dark'
            | 'auto') ?? 'auto',
      },
    };
    setForm(f);
    setPhotoURL(userProfile.photoURL);
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    const changed =
      form.displayName !== (userProfile.displayName || '') ||
      form.bio !== (userProfile.bio || '') ||
      form.website !== (userProfile.website || '') ||
      form.location !== (userProfile.location || '') ||
      form.socialLinks.twitter !==
        (userProfile.socialLinks?.twitter || '') ||
      form.socialLinks.instagram !==
        (userProfile.socialLinks?.instagram || '') ||
      form.socialLinks.youtube !==
        (userProfile.socialLinks?.youtube || '') ||
      form.preferences.publicProfile !==
        (userProfile.preferences?.publicProfile ?? true) ||
      form.preferences.theme !==
        (userProfile.preferences?.theme ?? 'auto') ||
      photoURL !== userProfile.photoURL;
    setHasChanges(changed);
  }, [form, photoURL, userProfile]);

  const handleCancel = () => {
    if (hasChanges) {
      if (
        confirm('You have unsaved changes. Leave without saving?')
      ) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const saveProfile = async () => {
    if (!db || !user?.uid) return;
    if (!form.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: form.displayName.trim(),
          bio: form.bio.trim(),
          website: form.website.trim(),
          location: form.location.trim(),
          socialLinks: {
            twitter: form.socialLinks.twitter.trim(),
            instagram: form.socialLinks.instagram.trim(),
            youtube: form.socialLinks.youtube.trim(),
          },
          preferences: {
            publicProfile: !!form.preferences.publicProfile,
            theme: form.preferences.theme,
            notifications: true,
            language: 'en',
          },
          photoURL: photoURL || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (
        auth?.currentUser &&
        auth.currentUser.displayName !==
          form.displayName.trim()
      ) {
        await updateAuthProfile(auth.currentUser, {
          displayName: form.displayName.trim(),
        });
      }

      toast.success('Profile updated');
      await reloadUser?.();
      setHasChanges(false);

      if (userProfile?.username) {
        setTimeout(
          () => router.push(`/user/${userProfile.username}`),
          800,
        );
      }
    } catch (e) {
      console.error('Save profile error:', e);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="My Profile - PattiBytes">
        <div className={styles.page}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className={styles.headerTop}>
              <button
                onClick={handleCancel}
                className={styles.backBtn}
              >
                <FaArrowLeft /> Back
              </button>
              {hasChanges && (
                <span className={styles.unsavedBadge}>
                  Unsaved changes
                </span>
              )}
            </div>
            <h1>Edit Profile</h1>
            <p>Customize your public profile and preferences</p>
          </motion.div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className={styles.cardHeader}>
              <FaUser className={styles.cardIcon} />
              <h2>Basic Information</h2>
            </div>

            <div className={styles.avatarRow}>
              <ProfilePictureUpload
                currentUrl={photoURL}
                onUploaded={(url) => {
                  setPhotoURL(url);
                  toast.success('Profile picture updated!');
                }}
              />
              <div className={styles.nameBlock}>
                <label className={styles.label}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      displayName: e.target.value,
                    })
                  }
                  maxLength={50}
                  className={styles.input}
                  placeholder="Your full name"
                  required
                />
                <small className={styles.hint}>
                  {form.displayName.length}/50 characters
                </small>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) =>
                    setForm({ ...form, bio: e.target.value })
                  }
                  rows={4}
                  maxLength={160}
                  className={styles.textarea}
                  placeholder="Tell us about yourself..."
                />
                <small className={styles.hint}>
                  {form.bio.length}/160 characters
                </small>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaGlobe /> Website
                  </label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        website: e.target.value,
                      })
                    }
                    className={styles.input}
                    placeholder="https://example.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <FaMapMarkerAlt /> Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        location: e.target.value,
                      })
                    }
                    className={styles.input}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className={styles.cardHeader}>
              <FaGlobe className={styles.cardIcon} />
              <h2>Social Links</h2>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FaTwitter /> Twitter
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>@</span>
                  <input
                    type="text"
                    value={form.socialLinks.twitter}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        socialLinks: {
                          ...form.socialLinks,
                          twitter: e.target.value,
                        },
                      })
                    }
                    className={styles.input}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FaInstagram /> Instagram
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>@</span>
                  <input
                    type="text"
                    value={form.socialLinks.instagram}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        socialLinks: {
                          ...form.socialLinks,
                          instagram: e.target.value,
                        },
                      })
                    }
                    className={styles.input}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FaYoutube /> YouTube
                </label>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>@</span>
                  <input
                    type="text"
                    value={form.socialLinks.youtube}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        socialLinks: {
                          ...form.socialLinks,
                          youtube: e.target.value,
                        },
                      })
                    }
                    className={styles.input}
                    placeholder="channel"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            <div className={styles.cardHeader}>
              <FaShieldAlt className={styles.cardIcon} />
              <h2>Preferences</h2>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={form.preferences.publicProfile}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        preferences: {
                          ...form.preferences,
                          publicProfile: e.target.checked,
                        },
                      })
                    }
                  />
                  <span className={styles.toggleText}>
                    <strong>Public Profile</strong>
                    <small>
                      Make your profile visible to everyone
                    </small>
                  </span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FaPalette /> Theme
                </label>
                <select
                  className={styles.select}
                  value={form.preferences.theme}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferences: {
                        ...form.preferences,
                        theme: e.target
                          .value as 'light' | 'dark' | 'auto',
                      },
                    })
                  }
                >
                  <option value="auto">Auto (System)</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.actions}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
          >
            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={saving}
            >
              <FaTimes /> Cancel
            </button>
            <motion.button
              className={styles.saveBtn}
              onClick={saveProfile}
              disabled={saving || !hasChanges}
              whileTap={{ scale: 0.98 }}
            >
              <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </motion.div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
