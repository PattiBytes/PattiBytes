import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updatePassword, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { FaLock, FaTrash, FaBell, FaShieldAlt, FaGlobe } from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';

export default function Settings() {
  const { user } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again before changing password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      toast.success('Account deleted successfully');
      router.push('/');
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again to delete account');
      } else {
        toast.error('Failed to delete account');
      }
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Settings - PattiBytes">
        <div className={styles.settings}>
          <h1>Settings</h1>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><FaLock /><h2>Change Password</h2></div>
            <form onSubmit={handlePasswordChange} className={styles.form}>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" disabled={loading} required />
              </div>
              <div className={styles.formGroup}>
                <label>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" disabled={loading} required />
              </div>
              <button type="submit" className={styles.saveBtn} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
            </form>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><FaShieldAlt /><h2>Privacy & Security</h2></div>
            <div className={styles.settingItem}><div><h3>Profile Visibility</h3><p>Control who can see your profile</p></div><select className={styles.select}><option>Public</option><option>Friends Only</option><option>Private</option></select></div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><FaBell /><h2>Notifications</h2></div>
            <div className={styles.settingItem}><div><h3>Email Notifications</h3><p>Receive email updates</p></div><label className={styles.switch}><input type="checkbox" defaultChecked /><span className={styles.slider}></span></label></div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><FaGlobe /><h2>Language</h2></div>
            <select className={styles.select}><option>English</option><option>ਪੰਜਾਬੀ (Punjabi)</option><option>हिंदी (Hindi)</option></select>
          </section>
          <section className={`${styles.section} ${styles.dangerSection}`}>
            <div className={styles.sectionHeader}><FaTrash /><h2>Danger Zone</h2></div>
            <p className={styles.dangerText}>Once you delete your account, there is no going back. Please be certain.</p>
            {!showDeleteConfirm ? (
              <button className={styles.dangerBtn} onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
            ) : (
              <div className={styles.deleteConfirm}>
                <p>Are you absolutely sure?</p>
                <div className={styles.deleteActions}>
                  <button onClick={() => setShowDeleteConfirm(false)} className={styles.cancelBtn}>Cancel</button>
                  <button onClick={handleDeleteAccount} className={styles.confirmDeleteBtn} disabled={loading}>{loading ? 'Deleting...' : 'Yes, Delete My Account'}</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </Layout>
    </AuthGuard>
  );
}
