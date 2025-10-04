import { useState, FormEvent, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { incrementPostCount } from '@/lib/username';
import { uploadToCloudinary } from '@/lib/cloudinary';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaImage, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import styles from '@/styles/Create.module.css';

export default function CreatePost() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'writing' as 'writing' | 'news' | 'place',
    location: '',
    imageUrl: ''
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadToCloudinary(file);
      setFormData({ ...formData, imageUrl });
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    setLoading(true);
    setError(null);

    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const postData = {
        title: formData.title,
        content: formData.content,
        preview: formData.content.substring(0, 200),
        type: formData.type,
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || null,
        imageUrl: formData.imageUrl || null,
        location: formData.location || null,
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0
      };

      await addDoc(collection(db, 'posts'), postData);
      await incrementPostCount(user.uid);

      router.push('/dashboard');
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Create Post - PattiBytes">
        <div className={styles.createPost}>
          <h1>Create New Post</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.typeSelector}>
              <button
                type="button"
                className={`${styles.typeButton} ${formData.type === 'writing' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, type: 'writing' })}
              >
                Writing
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${formData.type === 'news' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, type: 'news' })}
              >
                News
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${formData.type === 'place' ? styles.active : ''}`}
                onClick={() => setFormData({ ...formData, type: 'place' })}
              >
                Place
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter a catchy title..."
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Content</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your content here..."
                rows={10}
                required
              />
              <div className={styles.characterCount}>
                {formData.content.length} characters
              </div>
            </div>

            {formData.type === 'place' && (
              <div className={styles.formGroup}>
                <label>
                  <FaMapMarkerAlt /> Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location..."
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label>
                <FaImage /> Image (optional)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.fileInput}
              />

              {!formData.imageUrl && (
                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <FaImage />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              )}

              {formData.imageUrl && (
                <div className={styles.imagePreview}>
                  <SafeImage
                    src={formData.imageUrl}
                    alt="Preview"
                    width={600}
                    height={400}
                    className={styles.previewImage}
                  />
                  <button
                    type="button"
                    className={styles.removeImage}
                    onClick={handleRemoveImage}
                  >
                    <FaTimes /> Remove Image
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              className={styles.submitButton}
              disabled={loading || uploading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <div className={styles.spinner} />
                  Publishing...
                </>
              ) : (
                'Publish Post'
              )}
            </motion.button>
          </form>

          {uploading && (
            <div className={styles.uploadingOverlay}>
              <div className={styles.uploadingContent}>
                <div className={styles.spinner} />
                <p>Uploading image...</p>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
