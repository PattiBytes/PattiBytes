import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { updateUserProfile } from '@/lib/username';
import { FaSave, FaUser, FaBell, FaLock, FaPalette } from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';

export default function Settings() {
  const { user, userProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    website: userProfile?.website || '',
    location: userProfile?.location || '',
  });

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSuccess(false);

    try {
      await updateUserProfile(user.uid, formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Settings - PattiBytes">
        <div className={styles.settings}>
          <div className={styles.container}>
            <h1>Settings</h1>

            <div className={styles.section}>
              <h2><FaUser /> Profile</h2>
              
              <div className={styles.profileSection}>
                <ProfilePictureUpload />
              </div>

              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Your display name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={160}
                />
                <small>{formData.bio.length}/160</small>
              </div>

              <div className={styles.formGroup}>
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Your location"
                />
              </div>

              <button onClick={handleSave} disabled={saving} className={styles.saveBtn}>
                <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
              </button>

              {success && <p className={styles.success}>Settings saved successfully!</p>}
            </div>

            <div className={styles.section}>
              <h2><FaBell /> Notifications</h2>
              <p>Notification settings coming soon...</p>
            </div>

            <div className={styles.section}>
              <h2><FaPalette /> Appearance</h2>
              <p>Theme settings coming soon...</p>
            </div>

            <div className={styles.section}>
              <h2><FaLock /> Privacy & Security</h2>
              <p>Privacy settings coming soon...</p>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
