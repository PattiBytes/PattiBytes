// components/AvatarUploader.tsx
import { useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import SafeImage from './SafeImage';
import type { User } from 'firebase/auth';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';

export default function AvatarUploader({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | undefined>(user.photoURL || undefined);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isCloudinaryConfigured()) {
      setError('Image uploads are not configured');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Max 10MB');
      return;
    }

    setBusy(true);
    setError(null);

    const { db } = getFirebaseClient();
    if (!db) {
      setError('Database not available');
      setBusy(false);
      return;
    }

   try {
  const secureUrl = await uploadToCloudinary(file, 'avatar', undefined);
  setUrl(secureUrl);
  await setDoc(doc(db, 'users', user.uid), { photoURL: secureUrl }, { merge: true });
} catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
 
  return (
    <div>
      <SafeImage
        src={url || '/images/default-avatar.png'}
        alt="avatar"
        width={96}
        height={96}
        style={{ borderRadius: '50%' }}
      />
      <label>
        <input type="file" accept="image/*" onChange={onPick} disabled={busy} hidden />
        <button type="button" disabled={busy}>{busy ? 'Uploading…' : 'Change photo'}</button>
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
