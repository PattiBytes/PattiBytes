// pages/bytes/create.tsx (snippet)
import { useState, useRef } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { toast } from 'react-hot-toast';

export default function CreateByte() {
  const { user, userProfile } = useAuth();
  const { db } = getFirebaseClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Select an image');
      e.target.value = '';
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Max 10MB');
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!db || !user || !userProfile) return toast.error('Sign in first');
    if (!file) return toast.error('Choose an image');
    if (!isCloudinaryConfigured()) return toast.error('Cloudinary not configured');

    try {
      setBusy(true);
      const url = await uploadToCloudinary(file, 'image');
      const now = Date.now();
      const expires = new Date(now + 24 * 60 * 60 * 1000); // 24h
      await addDoc(collection(db, 'bytes'), {
        userId: user.uid,
        userName: userProfile.displayName,
        userPhoto: userProfile.photoURL || null,
        imageUrl: url,
        createdAt: serverTimestamp(),
        expiresAt: expires,
      });
      toast.success('Byte posted!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload byte');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onSelect} hidden />
      <button onClick={pick} disabled={busy}>Choose Image</button>
      <button onClick={submit} disabled={busy || !file}>Post Byte</button>
    </div>
  );
}
