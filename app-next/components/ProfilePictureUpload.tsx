import { useRef, useState } from 'react';
import { uploadImageAuto } from '@/lib/uploads';
import { isCloudinaryConfigured } from '@/lib/cloudinary';
import { isSupabaseConfigured } from '@/lib/supabase';
import SafeImage from './SafeImage';
import { FaUpload } from 'react-icons/fa';
import styles from '@/styles/ProfilePictureUpload.module.css';
import { useAuth } from '@/context/AuthContext';

interface Props {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  maxSizeMB?: number;
}

export default function ProfilePictureUpload({ currentUrl, onUploaded, maxSizeMB = 5 }: Props) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = () => fileRef.current?.click();

  const onChoose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Guard: require at least one provider configured
    if (!isCloudinaryConfigured() && !isSupabaseConfigured()) {
      alert('Image uploads are not configured. Set Cloudinary or Supabase env variables in .env.local and restart the dev server.');
      e.target.value = '';
      return;
    }

    if (!f.type.startsWith('image/')) {
      alert('Please select an image file');
      e.target.value = '';
      return;
    }

    if (f.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Max ${maxSizeMB}MB.`);
      e.target.value = '';
      return;
    }

    const r = new FileReader();
    r.onload = (ev) => setPreview((ev.target?.result as string) || currentUrl);
    r.readAsDataURL(f);

    try {
      setUploading(true);
      setProgress(30);
      const url = await uploadImageAuto(f, { uid: user?.uid });
      setProgress(100);
      onUploaded(url);
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert((err as Error).message || 'Upload failed. Please try again.');
      setPreview(currentUrl);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.avatarBox} onClick={pick} role="button" aria-label="Change profile picture" tabIndex={0}>
        <SafeImage src={preview} alt="Profile" width={120} height={120} />
        <div className={styles.overlay}>
          <FaUpload />
          <span>Change</span>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onChoose} style={{ display: 'none' }} />
      {uploading && (
        <div className={styles.progress} aria-live="polite" aria-label="Uploading">
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
