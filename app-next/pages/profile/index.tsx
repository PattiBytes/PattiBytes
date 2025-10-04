import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaSave, FaTimes, FaMapMarkerAlt, FaLink, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
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

      setMessage({ type: 'success', text: '✓ Profile updated successfully! Others can now see your changes.' });
      setEditing(false);
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="My Profile - PattiBytes">
        <div className={styles.profile}>
          <div className={styles.coverImage}>
            <div className={styles.coverGradient} />
          </div>

          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <ProfilePictureUpload 
                showControls={true}
                onUploadComplete={() => {
                  setMessage({ type: 'success', text: '✓ Profile picture updated! Others can now see it.' });
                  setTimeout(() => setMessage(null), 3000);
                }}
              />
            </div>

            <div className={styles.profileInfo}>
              <h1>{userProfile?.displayName}</h1>
              <p className={styles.username}>@{userProfile?.username}</p>
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

          <div className={styles.profileContent}>
            {message && (
              <motion.div 
                className={`${styles.message} ${styles[message.type]}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {message.text}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {editing ? (
                <motion.form
                  key="edit"
                  className={styles.editForm}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  onSubmit={handleSubmit}
                >
                  <div className={styles.formGroup}>
                    <label>Display Name *</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      required
                      disabled={loading}
                      placeholder="Your full name"
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
                      disabled={loading}
                    />
                    <small className={formData.bio.length > 140 ? styles.warning : ''}>
                      {formData.bio.length}/160 characters
                    </small>
                  </div>

                  <div className={styles.formGroup}>
                    <label><FaMapMarkerAlt /> Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country"
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label><FaLink /> Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://yourwebsite.com"
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.socialLinks}>
                    <h3>Social Media</h3>
                    
                    <div className={styles.formGroup}>
                      <label><FaTwitter /> Twitter</label>
                      <input
                        type="text"
                        value={formData.twitter}
                        onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                        placeholder="@username"
                        disabled={loading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label><FaInstagram /> Instagram</label>
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@username"
                        disabled={loading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label><FaYoutube /> YouTube</label>
                      <input
                        type="text"
                        value={formData.youtube}
                        onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                        placeholder="Channel URL"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => {
                        setEditing(false);
                        setMessage(null);
                      }}
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
                <motion.div 
                  key="view"
                  className={styles.profileDetails}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {userProfile?.bio && (
                    <div className={styles.section}>
                      <h3>Bio</h3>
                      <p>{userProfile.bio}</p>
                    </div>
                  )}

                  {(userProfile?.location || userProfile?.website || userProfile?.socialLinks?.twitter || userProfile?.socialLinks?.instagram || userProfile?.socialLinks?.youtube) && (
                    <div className={styles.infoGrid}>
                      {userProfile?.location && (
                        <div className={styles.infoItem}>
                          <FaMapMarkerAlt className={styles.infoIcon} />
                          <span>{userProfile.location}</span>
                        </div>
                      )}

                      {userProfile?.website && (
                        <div className={styles.infoItem}>
                          <FaLink className={styles.infoIcon} />
                          <a href={userProfile.website} target="_blank" rel="noopener noreferrer">
                            {userProfile.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}

                      {userProfile?.socialLinks?.twitter && (
                        <div className={styles.infoItem}>
                          <FaTwitter className={styles.infoIcon} />
                          <a href={`https://twitter.com/${userProfile.socialLinks.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                            {userProfile.socialLinks.twitter}
                          </a>
                        </div>
                      )}

                      {userProfile?.socialLinks?.instagram && (
                        <div className={styles.infoItem}>
                          <FaInstagram className={styles.infoIcon} />
                          <a href={`https://instagram.com/${userProfile.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                            {userProfile.socialLinks.instagram}
                          </a>
                        </div>
                      )}

                      {userProfile?.socialLinks?.youtube && (
                        <div className={styles.infoItem}>
                          <FaYoutube className={styles.infoIcon} />
                          <a href={userProfile.socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                            YouTube Channel
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {!userProfile?.bio && !userProfile?.location && !userProfile?.website && (
                    <div className={styles.emptyState}>
                      <p>Complete your profile to let others know more about you!</p>
                      <button onClick={() => setEditing(true)} className={styles.emptyBtn}>
                        <FaEdit /> Edit Profile
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
