import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaSignOutAlt, FaSave } from 'react-icons/fa';
import styles from '@/styles/Account.module.css';

function AccountInner() {
  const { user, signOut } = useAuth(); // Changed from 'logout' to 'signOut'
  const router = useRouter();
  const [name, setName] = useState(user?.displayName || '');
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);

    try {
      // Update Firebase Auth profile
      if (user) {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(user, {
          displayName: name
        });
        setOk('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Layout title="Account - PattiBytes">
        <div className={styles.loading}>
          <p>Please sign in to access your account.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Account - PattiBytes">
      <div className={styles.account}>
        <div className={styles.header}>
          <h1>Account Settings</h1>
          <p>Manage your account information</p>
        </div>

        <div className={styles.content}>
          {/* Profile Section */}
          <motion.section 
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>
              <FaUser /> Profile Information
            </h2>

            <form onSubmit={handleUpdateProfile} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email">
                  <FaEnvelope /> Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className={styles.disabledInput}
                />
                <small>Email cannot be changed</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="displayName">
                  <FaUser /> Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                />
              </div>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              {ok && (
                <div className={styles.success}>
                  {ok}
                </div>
              )}

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
            </form>
          </motion.section>

          {/* Account Actions */}
          <motion.section 
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2>Account Actions</h2>
            
            <div className={styles.actions}>
              <button 
                onClick={handleSignOut}
                className={styles.signOutButton}
              >
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </Layout>
  );
}

export default function Account() {
  return <AccountInner />;
}
