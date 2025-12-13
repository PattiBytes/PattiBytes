import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft,
  FaSave,
  FaTimes,
  FaUser,
} from 'react-icons/fa';
import styles from '@/styles/CompleteProfile.module.css';

interface FormData {
  displayName: string;
  bio: string;
  location: string;
  website: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const next = typeof router.query.next === 'string' ? router.query.next : '/dashboard';

  const { user, userProfile, reloadUser } = useAuth();
  const { db, auth } = getFirebaseClient();

  const [form, setForm] = useState<FormData>({
    displayName: '',
    bio: '',
    location: '',
    website: '',
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initializedRef = useRef(false);

  // Initialize once (like your /profile/edit.tsx pattern)
  useEffect(() => {
    if (!user) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initialDisplayName =
      userProfile?.displayName ||
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'User');

    setForm({
      displayName: initialDisplayName || '',
      bio: userProfile?.bio || '',
      location: userProfile?.location || '',
      website: userProfile?.website || '',
    });
  }, [user, userProfile]);

  useEffect(() => {
    const changed =
      (form.displayName || '') !== (userProfile?.displayName || (user?.displayName || '')) ||
      (form.bio || '') !== (userProfile?.bio || '') ||
      (form.location || '') !== (userProfile?.location || '') ||
      (form.website || '') !== (userProfile?.website || '');

    setHasChanges(!!changed);
  }, [form, userProfile, user]);

  const handleSkip = () => {
    router.replace(next);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Skip profile setup?')) {
        router.replace(next);
      }
      return;
    }
    router.replace(next);
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
          displayNameLower: form.displayName.trim().toLowerCase(),
          bio: form.bio.trim(),
          location: form.location.trim(),
          website: form.website.trim(),
          // Optional flag for your analytics/onboarding tracking (safe even if not in types)
          onboarding: { profileCompleted: true, completedAt: serverTimestamp() },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if (
        auth?.currentUser &&
        auth.currentUser.displayName !== form.displayName.trim()
      ) {
        await updateAuthProfile(auth.currentUser, {
          displayName: form.displayName.trim(),
        });
      }

      toast.success('Profile saved');
      await reloadUser?.();
      setHasChanges(false);

      router.replace(next);
    } catch (e) {
      console.error('Complete profile save error:', e);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard requireUsername={true}>
      <Layout title="Complete Profile - PattiBytes">
        <div className={styles.page}>
          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.headerRow}>
              <button className={styles.backBtn} onClick={handleCancel} disabled={saving}>
                <FaArrowLeft /> Back
              </button>

              <button className={styles.skipBtn} onClick={handleSkip} disabled={saving}>
                Skip
              </button>
            </div>

            <h1 className={styles.title}>Complete Profile</h1>
            <p className={styles.sub}>This step is optional — you can skip and do it later.</p>

            <div className={styles.form}>
              <label className={styles.label}>
                <FaUser /> Display Name *
              </label>
              <input
                className={styles.input}
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                maxLength={50}
                placeholder="Your full name"
              />
              <small className={styles.hint}>
                {form.displayName.length}/50 characters
              </small>

              <label className={styles.label}>Bio</label>
              <textarea
                className={styles.textarea}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                maxLength={160}
                rows={4}
                placeholder="Tell people about yourself..."
              />
              <small className={styles.hint}>
                {form.bio.length}/160 characters
              </small>

              <label className={styles.label}>Location</label>
              <input
                className={styles.input}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                maxLength={60}
                placeholder="City, Country"
              />

              <label className={styles.label}>Website</label>
              <input
                className={styles.input}
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                maxLength={120}
                placeholder="https://example.com"
              />

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <FaTimes /> Cancel
                </button>

                <button
                  type="button"
                  className={styles.primary}
                  onClick={saveProfile}
                  disabled={saving}
                >
                  <FaSave /> {saving ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
