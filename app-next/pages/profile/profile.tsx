// pages/settings/profile.tsx (new page)
import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/lib/username';

export default function ProfileSettings() {
  const { user, userProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const onUploaded = async (url: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { photoURL: url });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Profile - PattiBytes">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
          <h1>Profile</h1>
          <ProfilePictureUpload currentUrl={userProfile?.photoURL} onUploaded={onUploaded} />
          {saving ? <p>Saving...</p> : null}
        </div>
      </Layout>
    </AuthGuard>
  );
}
