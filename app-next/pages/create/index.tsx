import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToCloudinary, uploadVideo, isCloudinaryConfigured } from '@/lib/cloudinary';
import { motion } from 'framer-motion';
import { FaPen, FaNewspaper, FaMapMarkerAlt, FaImage, FaTimes, FaPaperPlane, FaVideo } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/CreatePost.module.css';

type PostType = 'writing' | 'news' | 'place' | 'video' | 'photo';

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;
const IMAGE_MIME = /^image\//;
const VIDEO_MIME = /^video\//;

export default function CreatePost() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { db } = getFirebaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialType = (router.query.type as PostType) || 'writing';
  const [type, setType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // If image is provided via query param, prefill preview and set type to photo
  useEffect(() => {
    const image = router.query.image as string | undefined;
    if (image) {
      setMediaPreview(image);
      setType('photo');
    }
  }, [router.query.image]);

  const openPicker = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = VIDEO_MIME.test(file.type);
    const isImage = IMAGE_MIME.test(file.type);

    if (!isVideo && !isImage) {
      toast.error('Please select an image or video file');
      e.target.value = '';
      return;
    }

    // Size checks aligned with Cloudinary unsigned preset limits
    if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image too large. Max ${MAX_IMAGE_MB}MB`);
      e.target.value = '';
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video too large. Max ${MAX_VIDEO_MB}MB`);
      e.target.value = '';
      return;
    }

    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
    setType(isVideo ? 'video' : 'photo');
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return toast.error('Database not initialized');
    if (!user || !userProfile) return toast.error('Sign in to create a post');

    const titleTrim = title.trim();
    const contentTrim = content.trim();
    const locationTrim = location.trim();

    if (!titleTrim) return toast.error('Please enter a title');
    if (!contentTrim) return toast.error('Please enter some content');

    // Guard Cloudinary configuration for media posts
    if ((type === 'photo' || type === 'video') && !isCloudinaryConfigured()) {
      return toast.error('Media uploads are not configured. Check Cloudinary env and presets.');
    }

    setUploading(true);
    setProgress(0);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let mediaType: 'image' | 'video' | undefined;

      if (media) {
        const isVid = VIDEO_MIME.test(media.type);
        setProgress(5);
        if (isVid) {
          // Use uploadVideo for progress UI
          videoUrl = await uploadVideo(media, (pct) => setProgress(Math.min(90, pct)));
          mediaType = 'video';
        } else {
          imageUrl = await uploadToCloudinary(media, 'image');
          setProgress(90);
          mediaType = 'image';
        }
      }

      setProgress(95);

      // Persist post; rules expect authorId and createdAt; keep list constraints on reads
      const docRef = await addDoc(collection(db, 'posts'), {
        type: type === 'photo' ? 'writing' : type, // keep legacy mapping if needed by UI
        mediaType: mediaType || (type === 'video' ? 'video' : 'image'),
        title: titleTrim,
        content: contentTrim,
        preview: contentTrim.substring(0, 220),
        location: locationTrim || null,
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL || null,
        imageUrl,
        videoUrl,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setProgress(100);
      toast.success('Post published!');
      router.push(`/posts/${docRef.id}`);
    } catch (err) {
      console.error('Post creation error:', err);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Create Post - PattiBytes">
        <div className={styles.page}>
          <motion.div className={styles.container} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                    className={type === 'photo' ? styles.active : ''}
                    onClick={() => setType('photo')}
                    disabled={uploading}
                  >
                    <FaImage /> Photo
                  </button>
                  <button
                    type="button"
                    className={type === 'video' ? styles.active : ''}
                    onClick={() => setType('video')}
                    disabled={uploading}
                  >
                    <FaVideo /> Video
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
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a catchy title..."
                  required
                  disabled={uploading}
                  maxLength={120}
                />
                <small>{title.length}/120</small>
              </div>

              <div className={styles.formGroup}>
                <label>Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
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
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State/Province"
                    required={type === 'place'}
                    disabled={uploading}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Media (image/video)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />

                {!mediaPreview ? (
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    onClick={openPicker}
                    disabled={uploading}
                  >
                    <FaImage /> Choose Media
                  </button>
                ) : (
                  <div className={styles.imagePreview}>
                    {type === 'video' ? (
                      <video src={mediaPreview} controls className={styles.previewVideo} />
                    ) : (
                      <SafeImage src={mediaPreview} alt="Preview" width={600} height={400} />
                    )}
                    <button type="button" className={styles.removeBtn} onClick={removeMedia} disabled={uploading}>
                      <FaTimes /> Remove
                    </button>
                  </div>
                )}
                <small>Images up to {MAX_IMAGE_MB}MB, videos up to {MAX_VIDEO_MB}MB (Cloudinary)</small>
              </div>

              {uploading && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  <span>{progress}%</span>
                </div>
              )}

              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={uploading}>
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
