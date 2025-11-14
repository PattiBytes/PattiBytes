// app-next/components/ProfilePictureUpload.tsx
import { useRef, useState } from 'react';
import SafeImage from './SafeImage';
import { FaUpload } from 'react-icons/fa';
import styles from '@/styles/ProfilePictureUpload.module.css';
import { toast } from 'react-hot-toast';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { updateUserProfile } from '@/lib/username';
import { useAuth } from '@/context/AuthContext';

interface Props {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  maxSizeMB?: number;
}

export default function ProfilePictureUpload({
  currentUrl,
  onUploaded,
  maxSizeMB = 5,
}: Props) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = () => {
    if (!uploading) fileRef.current?.click();
  };

  const onChoose = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!isCloudinaryConfigured()) {
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

    // local preview
    const r = new FileReader();
    r.onload = (ev) => setPreview(ev.target?.result as string);
    r.readAsDataURL(f);

    if (!user?.uid) {
      toast.error('You must be logged in to update profile picture');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      setProgress(30);
      const toastId = toast.loading('Uploading profile picture...');

      // Cloudinary avatar upload (with our fallback logic)
      const url = await uploadToCloudinary(f, 'avatar');
      setProgress(80);

      // Update Firestore user profile
      await updateUserProfile(user.uid, { photoURL: url });
      setProgress(100);

      toast.success('Profile picture updated!', { id: toastId });
      onUploaded(url);
      setPreview(url);
    } catch (err) {
      console.error('Avatar upload error', err);
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      toast.error(message, { id: 'avatar-upload' });
      // revert preview if it was previously set
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
        <div
          className={styles.progress}
          aria-live="polite"
          aria-label="Uploading"
        >
          <div
            className={styles.fill}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
