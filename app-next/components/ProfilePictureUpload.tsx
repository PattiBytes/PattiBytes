// app-next/components/ProfilePictureUpload.tsx
import { useRef, useState } from 'react';
import { uploadImageAuto } from '@/lib/uploads';
import { isCloudinaryConfigured } from '@/lib/cloudinary';
import { isSupabaseConfigured } from '@/lib/supabase';
import { updateUserProfile } from '@/lib/username';
import SafeImage from './SafeImage';
import { FaUpload } from 'react-icons/fa';
import styles from '@/styles/ProfilePictureUpload.module.css';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

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
      toast.error('Image uploads are not configured');
      e.target.value = '';
      return;
    }

    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image file');
      e.target.value = '';
      return;
    }

    if (f.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMB}MB`);
      e.target.value = '';
      return;
    }

    const r = new FileReader();
    r.onload = (ev) => setPreview((ev.target?.result as string) || currentUrl);
    r.readAsDataURL(f);

    try {
      setUploading(true);
      setProgress(30);
      toast.loading('Uploading profile picture...', { id: 'avatar-upload' });
      
      const url = await uploadImageAuto(f, { uid: user?.uid, type: 'avatar' });
      setProgress(80);

      // Update user profile in Firestore
      if (user?.uid) {
        await updateUserProfile(user.uid, { photoURL: url });
      }

      setProgress(100);
      toast.success('Profile picture updated!', { id: 'avatar-upload' });
      onUploaded(url);
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error((err as Error).message || 'Upload failed', { id: 'avatar-upload' });
      setPreview(currentUrl);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.wrap}>
      <div 
        className={styles.avatarBox} 
        onClick={uploading ? undefined : pick} 
        role="button" 
        aria-label="Change profile picture" 
        tabIndex={uploading ? -1 : 0}
        style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
      >
        <SafeImage 
          src={preview || '/images/default-avatar.png'} 
          alt="Profile" 
          width={120} 
          height={120} 
        />
        {!uploading && (
          <div className={styles.overlay}>
            <FaUpload />
            <span>Change</span>
          </div>
        )}
        {uploading && (
          <div className={styles.uploadingOverlay}>
            <div className={styles.uploadSpinner} />
            <span>{progress}%</span>
          </div>
        )}
      </div>
      <input 
        ref={fileRef} 
        type="file" 
        accept="image/*" 
        onChange={onChoose} 
        disabled={uploading}
        style={{ display: 'none' }} 
      />
      {uploading && (
        <div className={styles.progress} aria-live="polite" aria-label="Uploading">
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
