import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import SafeImage from './SafeImage';
import { FaCamera, FaSpinner, FaTimes } from 'react-icons/fa';
import styles from '@/styles/ProfilePictureUpload.module.css';

export default function ProfilePictureUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    };
    reader.readAsDataURL(file);

    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;

    setUploading(true);
    setError(null);

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
      await setDoc(
        doc(db, 'users', user.uid),
        { photoURL, updatedAt: new Date() },
        { merge: true }
      );

      // Update Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL });
      }

      setPreview(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        >
          {uploading ? (
            <FaSpinner className={styles.spinning} />
          ) : (
            <FaCamera />
          )}
        </button>

        {preview && (
          <button 
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={uploading}
          >
            <FaTimes />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className={styles.fileInput}
      />

      {error && <p className={styles.error}>{error}</p>}
      {uploading && <p className={styles.uploading}>Uploading...</p>}
    </div>
  );
}
