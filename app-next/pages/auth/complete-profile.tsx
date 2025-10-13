// app-next/pages/auth/complete-profile.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import UsernameField from '@/components/UsernameField';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useAuth } from '@/context/AuthContext';
import { claimUsername, getUserProfile, updateUserProfile } from '@/lib/username';
import styles from '@/styles/CompleteProfile.module.css';
import { toast } from 'react-hot-toast';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setAvatar(user.photoURL || undefined);

    (async () => {
      const existing = await getUserProfile(user.uid);
      if (existing?.username) router.replace('/dashboard');
    })();
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const dn = displayName.trim();
    const un = username.trim().toLowerCase();
    if (!dn) return toast.error('Please enter display name');
    if (!un) return toast.error('Please choose a username');

    try {
      setBusy(true);
      await claimUsername(un, user.uid, {
        uid: user.uid,
        email: user.email || '',
        displayName: dn,
        photoURL: avatar,
      });
      await updateUserProfile(user.uid, { displayName: dn, photoURL: avatar });
      toast.success('Profile completed!');
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete profile';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Complete Profile - PattiBytes">
        <div className={styles.page}>
          <div className={styles.card}>
            <h1>Complete Profile</h1>
            <p className={styles.sub}>Choose a public username and confirm display name</p>

            <form onSubmit={submit} className={styles.form}>
              <div className={styles.row}>
                <ProfilePictureUpload currentUrl={avatar} onUploaded={(url) => setAvatar(url)} maxSizeMB={5} />
              </div>

              <div className={styles.row}>
                <label className={styles.label}>Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={styles.input}
                  maxLength={50}
                  placeholder="Your name"
                />
              </div>

              <UsernameField value={username} onChange={setUsername} />

              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? 'Saving…' : 'Save & Continue'}
              </button>
            </form>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
