import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/lib/username';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FaCamera, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
import styles from '@/styles/Profile.module.css';

export default function Profile() {
  const { userProfile, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    website: '',
    location: '',
    twitter: '',
    instagram: '',
    youtube: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        website: userProfile.website || '',
        location: userProfile.location || '',
        twitter: userProfile.socialLinks?.twitter || '',
        instagram: userProfile.socialLinks?.instagram || '',
        youtube: userProfile.socialLinks?.youtube || ''
      });
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      await updateUserProfile(user.uid, {
        displayName: formData.displayName,
        bio: formData.bio,
        website: formData.website,
        location: formData.location,
        socialLinks: {
          twitter: formData.twitter,
          instagram: formData.instagram,
          youtube: formData.youtube
        }
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Profile - PattiBytes">
      <div className={styles.profile}>
        {/* Cover Image */}
        <div className={styles.coverImage}>
          <button className={styles.changeCoverButton}>
            <FaCamera />
          </button>
        </div>

        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrapper}>
            {userProfile?.photoURL ? (
              <Image
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                width={120}
                height={120}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {userProfile?.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
            <button className={styles.changeAvatarButton}>
              <FaCamera />
            </button>
          </div>

          <div className={styles.profileInfo}>
            <h1>{userProfile?.displayName}</h1>
            <p className={styles.username}>@{userProfile?.username}</p>
            <p className={styles.email}>{userProfile?.email}</p>
          </div>

          {!editing && (
            <button 
              className={styles.editButton}
              onClick={() => setEditing(true)}
            >
              <FaEdit /> Edit Profile
            </button>
          )}
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{userProfile?.stats?.postsCount || 0}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{userProfile?.stats?.followersCount || 0}</span>
            <span className={styles.statLabel}>Followers</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{userProfile?.stats?.followingCount || 0}</span>
            <span className={styles.statLabel}>Following</span>
          </div>
        </div>

        {/* Profile Content */}
        <div className={styles.profileContent}>
          {editing ? (
            <motion.form
              className={styles.editForm}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
            >
              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  maxLength={160}
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
                <small>{formData.bio.length}/160 characters</small>
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
                  placeholder="Patti, Punjab"
                />
              </div>

              <div className={styles.socialLinks}>
                <h3>Social Links</h3>
                
                <div className={styles.formGroup}>
                  <label>Twitter</label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="@username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Instagram</label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>YouTube</label>
                  <input
                    type="text"
                    value={formData.youtube}
                    onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                    placeholder="Channel URL"
                  />
                </div>
              </div>

              {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                  {message.text}
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setEditing(false)}
                  disabled={loading}
                >
                  <FaTimes /> Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <div className={styles.profileDetails}>
              {userProfile?.bio && (
                <div className={styles.section}>
                  <h3>Bio</h3>
                  <p>{userProfile.bio}</p>
                </div>
              )}

              {userProfile?.location && (
                <div className={styles.section}>
                  <h3>Location</h3>
                  <p>{userProfile.location}</p>
                </div>
              )}

              {userProfile?.website && (
                <div className={styles.section}>
                  <h3>Website</h3>
                  <a href={userProfile.website} target="_blank" rel="noopener noreferrer">
                    {userProfile.website}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
