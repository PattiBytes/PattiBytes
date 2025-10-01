import { useState } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import type { User } from 'firebase/auth';

export default function AvatarUploader({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | undefined>(user.photoURL || undefined);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    // Check if Firebase services are available
    if (!storage || !db) {
      setError('Storage service not available');
      return;
    }

    setBusy(true);
    setError(null);
    
    try {
      const key = `avatars/${user.uid}/${Date.now()}-${file.name}`;
      const r = ref(storage, key);
      await uploadBytes(r, file);
      const durl = await getDownloadURL(r);
      setUrl(durl);
      await setDoc(doc(db, 'users', user.uid), { photoURL: durl }, { merge: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div>
      <Image 
        src={url || '/icons/pwab-192.png'} 
        alt="avatar" 
        width={96} 
        height={96} 
        style={{borderRadius:'50%'}} 
      />
      <label>
        <input type="file" accept="image/*" onChange={onPick} disabled={busy} hidden />
        <span className="btn">{busy ? 'Uploading…' : 'Change photo'}</span>
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
