import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'framer-motion';
import { FaPen, FaNewspaper, FaMapMarkerAlt, FaImage, FaTimes, FaPaperPlane } from 'react-icons/fa';
import styles from '@/styles/CreatePost.module.css';

type PostType = 'writing' | 'news' | 'place';

export default function CreatePost() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { db, storage } = getFirebaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PostType>('writing');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !userProfile) return;

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      let imageUrl: string | undefined;

      if (image && storage) {
        const path = `posts/${user.uid}/${Date.now()}-${image.name}`;
        const storageReference = ref(storage, path);
        
        setProgress(30);
        await uploadBytes(storageReference, image);
        
        setProgress(60);
        imageUrl = await getDownloadURL(storageReference);
        
        setProgress(80);
      }

      const docRef = await addDoc(collection(db, 'posts'), {
        type,
        title: title.trim(),
        content: content.trim(),
        location: location.trim() || null,
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || null,
        imageUrl: imageUrl || null,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setProgress(100);
      router.push(`/posts/${docRef.id}`);
    } catch (err) {
      console.error('Post creation error:', err);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Create Post - PattiBytes">
        <div className={styles.page}>
          <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1>Create Post</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.typeSelector}>
                <label>Post Type</label>
                <div className={styles.types}>
                  <button
                    type="button"
                    className={type === 'writing' ? styles.active : ''}
                    onClick={() => setType('writing')}
                    disabled={uploading}
                  >
                    <FaPen /> Writing
                  </button>
                  <button
                    type="button"
                    className={type === 'news' ? styles.active : ''}
                    onClick={() => setType('news')}
                    disabled={uploading}
                  >
                    <FaNewspaper /> News
                  </button>
                  <button
                    type="button"
                    className={type === 'place' ? styles.active : ''}
                    onClick={() => setType('place')}
                    disabled={uploading}
                  >
                    <FaMapMarkerAlt /> Place
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter a catchy title..."
                  required
                  disabled={uploading}
                  maxLength={100}
                />
                <small>{title.length}/100</small>
              </div>

              <div className={styles.formGroup}>
                <label>Content *</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your content here..."
                  rows={10}
                  required
                  disabled={uploading}
                  maxLength={5000}
                />
                <small>{content.length}/5000</small>
              </div>

              {(type === 'place' || type === 'news') && (
                <div className={styles.formGroup}>
                  <label>
                    <FaMapMarkerAlt /> Location {type === 'place' && '*'}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="City, State/Province"
                    required={type === 'place'}
                    disabled={uploading}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Image (optional)</label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />

                {!imagePreview ? (
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <FaImage /> Choose Image
                  </button>
                ) : (
                  <div className={styles.imagePreview}>
                    <SafeImage src={imagePreview} alt="Preview" width={600} height={400} />
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={removeImage}
                      disabled={uploading}
                    >
                      <FaTimes /> Remove
                    </button>
                  </div>
                )}
                <small>Max size: 10MB • Supported: JPG, PNG, GIF, WebP</small>
              </div>

              {uploading && (
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${progress}%` }}
                  />
                  <span>{progress}%</span>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => router.back()}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={uploading || !title.trim() || !content.trim()}
                >
                  <FaPaperPlane /> {uploading ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
