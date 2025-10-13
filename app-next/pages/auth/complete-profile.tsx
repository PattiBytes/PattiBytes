// app-next/pages/auth/complete-profile.tsx
import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/CompleteProfile.module.css';

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // call API/logic already implemented in your project to finish profile
  };

  return (
    <AuthGuard>
      <Layout title="Complete Profile - PattiBytes">
        <div className={styles.page}>
          <div className={styles.card}>
            <h1 className={styles.title}>Complete Profile</h1>
            <p className={styles.sub}>Finish setting up the account to continue</p>

            <form onSubmit={onSubmit} className={styles.form}>
              <label className={styles.label}>Display Name</label>
              <input
                className={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Your full name"
              />

              <label className={styles.label}>Username</label>
              <input
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                placeholder="username"
              />

              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => history.back()}>
                  Cancel
                </button>
                <button type="submit" className={styles.primary}>
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
