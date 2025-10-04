// components/AvatarUploader.tsx

import { useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import SafeImage from './SafeImage';
import type { User } from 'firebase/auth';

export default function AvatarUploader({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | undefined>(user.photoURL || undefined);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    // Get storage and db from client
    const { storage, db } = getFirebaseClient();
    if (!storage || !db) {
      setError('Storage service not available');
      setBusy(false);
      return;
    }

    try {
      const key = `avatars/${user.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, key);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setUrl(downloadUrl);
      await setDoc(doc(db, 'users', user.uid), { photoURL: downloadUrl }, { merge: true });
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
        src={url || '/images/logo.png'}
        alt="avatar"
        width={96}
        height={96}
        style={{ borderRadius: '50%' }}
      />
      <label>
        <input
          type="file"
          accept="image/*"
          onChange={onPick}
          disabled={busy}
          hidden
        />
        <button type="button">
          {busy ? 'Uploading…' : 'Change photo'}
        </button>
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
