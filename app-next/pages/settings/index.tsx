import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, limit, query, where, writeBatch } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { FaLock, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';

export default function Settings() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { db } = getFirebaseClient();

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }

    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email || '', currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      showMessage('success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password update error:', err);
      showMessage('error', 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  const deleteUserData = async (uid: string) => {
    if (!db || !uid) return;

    try {
      const postsQ = query(collection(db, 'posts'), where('authorId', '==', uid), limit(500));
      const postsSnap = await getDocs(postsQ);
      if (!postsSnap.empty) {
        const batch = writeBatch(db);
        postsSnap.docs.forEach(d => batch.delete(doc(db, 'posts', d.id)));
        await batch.commit();
      }

      const chatsQ = query(collection(db, 'chats'), where('participants', 'array-contains', uid), limit(500));
      const chatsSnap = await getDocs(chatsQ);
      if (!chatsSnap.empty) {
        const batch = writeBatch(db);
        chatsSnap.docs.forEach(d => {
          const participants = (d.data().participants || []).filter((id: string) => id !== uid);
          batch.set(doc(db, 'chats', d.id), { participants }, { merge: true });
        });
        await batch.commit();
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', uid), limit(1)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        if (userData?.username) {
          await deleteDoc(doc(db, 'usernames', userData.username.toLowerCase()));
        }
      }

      await deleteDoc(doc(db, 'users', uid));
      try {
        await deleteDoc(doc(db, 'admins', uid));
      } catch {}
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  };

  const handleAccountDeletion = async () => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      'Are you absolutely sure? This will permanently delete your account and all your data. This action cannot be undone.'
    );
    if (!confirmed) return;

    const password = window.prompt('Please enter your current password to confirm deletion:');
    if (!password) return;

    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email || '', password);
      await reauthenticateWithCredential(user, cred);
      await deleteUserData(user.uid);
      await deleteUser(user);
      alert('Your account has been deleted successfully');
      router.replace('/auth/register');
    } catch (err) {
      console.error('Account deletion error:', err);
      showMessage('error', 'Failed to delete account. Please try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Settings - PattiBytes">
        <div className={styles.page}>
          <h1>Account Settings</h1>

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

          <form onSubmit={handlePasswordChange} className={styles.card}>
            <div className={styles.cardHeader}>
              <FaLock />
              <h2>Change Password</h2>
            </div>
            
            <div className={styles.formGroup}>
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                disabled={busy}
                placeholder="Enter current password"
              />
            </div>

            <div className={styles.formGroup}>
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                disabled={busy}
                placeholder="Enter new password (min. 8 characters)"
                minLength={8}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={busy}
                placeholder="Confirm new password"
                minLength={8}
              />
            </div>

            <button type="submit" className={styles.primaryBtn} disabled={busy}>
              {busy ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className={styles.cardDanger}>
            <div className={styles.cardHeader}>
              <FaTrash />
              <h2>Delete Account</h2>
            </div>
            
            <div className={styles.warningBox}>
              <FaExclamationTriangle />
              <div>
                <strong>Warning: This action is irreversible</strong>
                <p>Deleting your account will permanently remove:</p>
                <ul>
                  <li>Your profile and username</li>
                  <li>All your posts and content</li>
                  <li>Your participation in chats</li>
                  <li>All your data from our systems</li>
                </ul>
              </div>
            </div>

            <button onClick={handleAccountDeletion} className={styles.dangerBtn} disabled={busy}>
              {busy ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
