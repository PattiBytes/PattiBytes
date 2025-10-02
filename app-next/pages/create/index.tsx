import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { incrementPostCount } from '@/lib/username';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FaImage, FaMapMarkerAlt } from 'react-icons/fa';
import styles from '@/styles/Create.module.css';

export default function CreatePost() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'writing' as 'writing' | 'news' | 'place',
    location: '',
    imageUrl: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    setLoading(true);
    setError(null);

    try {
      const { db } = getFirebaseClient();
      
      const postData = {
        title: formData.title,
        content: formData.content,
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
    <Layout title="Create Post - PattiBytes">
      <div className={styles.createPost}>
        <h1>Create New Post</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Post Type */}
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

          {/* Title */}
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

          {/* Content */}
          <div className={styles.formGroup}>
            <label>Content</label>
            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your content here..."
              rows={10}
              required
            />
          </div>

          {/* Location (for places) */}
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

          {/* Image URL */}
          <div className={styles.formGroup}>
            <label>
              <FaImage /> Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? 'Publishing...' : 'Publish Post'}
          </motion.button>
        </form>
      </div>
    </Layout>
  );
}
