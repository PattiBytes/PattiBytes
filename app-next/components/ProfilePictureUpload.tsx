import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import SafeImage from './SafeImage';
import { FaCamera, FaSpinner, FaTimes, FaCheck } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/styles/ProfilePictureUpload.module.css';

interface ProfilePictureUploadProps {
  onUploadComplete?: (url: string) => void;
  showControls?: boolean;
}

export default function ProfilePictureUpload({ 
  onUploadComplete,
  showControls = true 
}: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async () => {
    if (!user || !preview) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const { storage, db, auth } = getFirebaseClient();
    if (!storage || !db || !auth) {
      setError('Service unavailable');
      setUploading(false);
      return;
    }

    try {
      // Upload to Firebase Storage
      const fileName = `avatars/${user.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL,
        updatedAt: new Date()
      });

      // Update Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
      }

      setSuccess(true);
      setPreview(null);
      
      if (onUploadComplete) {
        onUploadComplete(photoURL);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.uploadContainer}>
      <div className={styles.avatarWrapper}>
        <SafeImage
          src={preview || user?.photoURL}
          alt="Profile"
          width={120}
          height={120}
          className={styles.avatar}
        />
        
        <button 
          className={styles.uploadButton}
          onClick={handleClick}
          disabled={uploading}
          type="button"
        >
          {uploading ? (
            <FaSpinner className={styles.spinning} />
          ) : (
            <FaCamera />
          )}
        </button>

        <AnimatePresence>
          {preview && showControls && (
            <motion.div 
              className={styles.controls}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <button 
                className={styles.confirmButton}
                onClick={uploadPhoto}
                disabled={uploading}
                type="button"
              >
                <FaCheck /> Save
              </button>
              <button 
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={uploading}
                type="button"
              >
                <FaTimes /> Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className={styles.fileInput}
      />

      <AnimatePresence>
        {error && (
          <motion.p 
            className={styles.error}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
        {uploading && (
          <motion.p 
            className={styles.uploading}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Uploading...
          </motion.p>
        )}
        {success && (
          <motion.p 
            className={styles.success}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            Profile picture updated!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
