// app-next/pages/create/index.tsx
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc as fsDoc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { uploadToCloudinary, uploadVideo, isCloudinaryConfigured } from '@/lib/cloudinary';
import { motion } from 'framer-motion';
import {
  FaPen,
  FaNewspaper,
  FaMapMarkerAlt,
  FaImage,
  FaTimes,
  FaPaperPlane,
  FaVideo,
  FaSave,
  FaFolderOpen,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/CreatePost.module.css';

type PostType = 'writing' | 'news' | 'place' | 'video' | 'photo';
type MediaType = 'image' | 'video';
type ServerTS = ReturnType<typeof serverTimestamp>;

interface PostDoc {
  type: string;
  mediaType?: MediaType;
  title: string;
  content: string;
  preview: string;
  location: string | null;
  tags: string[];
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorPhoto?: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isOfficial: boolean;
  isDraft: boolean;
  expiresAt?: Timestamp | null;
  createdAt?: Timestamp | ServerTS;
  updatedAt: Timestamp | ServerTS;
}

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 200;
const IMAGE_MIME = /^image\//;
const VIDEO_MIME = /^video\//;
const DRAFT_KEY = 'pattibytes_draft_post';

export default function CreatePost() {
  const { user, userProfile, isAdmin } = useAuth();
  const router = useRouter();
  const { db } = getFirebaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialType = (router.query.type as PostType) || 'writing';
  const editId = typeof router.query.edit === 'string' ? router.query.edit : null;

  const [type, setType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingEdit, setLoadingEdit] = useState<boolean>(!!editId);

  // Load local draft
  useEffect(() => {
    if (editId) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as {
          title?: string;
          content?: string;
          location?: string;
          tags?: string;
          type?: PostType;
        } | null;
        if (draft && (draft.title || draft.content)) {
          if (confirm('Load saved local draft?')) {
            setTitle(draft.title || '');
            setContent(draft.content || '');
            setLocation(draft.location || '');
            setTags(draft.tags || '');
            setType(draft.type || 'writing');
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        }
      }
    } catch {
      // ignore parse error
    }
  }, [editId]);

  // Auto-save to local draft
  useEffect(() => {
    if (editId) return;
    const interval = setInterval(() => {
      if (title || content) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, content, location, tags, type })
        );
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [title, content, location, tags, type, editId]);

  // Pre-fill image from query
  useEffect(() => {
    const image = router.query.image as string | undefined;
    if (image) {
      setMediaPreview(image);
      setType('photo');
    }
  }, [router.query.image]);

  // Load existing post for edit
  useEffect(() => {
    const loadEdit = async () => {
      if (!editId || !db) return;
      try {
        const ref = fsDoc(db, 'posts', editId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Post not found');
        const data = snap.data() as PostDoc;

        setTitle(data.title || '');
        setContent(data.content || '');
        setLocation(data.location || '');
        setTags(Array.isArray(data.tags) ? data.tags.join(', ') : '');
        setIsOfficial(Boolean(data.isOfficial));
        setType((data.type as PostType) || 'writing');
        if (data.imageUrl) setMediaPreview(data.imageUrl);
        if (data.videoUrl) setMediaPreview(data.videoUrl);
      } catch {
        toast.error('Failed to load post for editing');
        router.replace('/dashboard');
      } finally {
        setLoadingEdit(false);
      }
    };
    loadEdit();
  }, [editId, db, router]);

  const openPicker = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const isVideo = VIDEO_MIME.test(file.type);
    const isImage = IMAGE_MIME.test(file.type);

    if (!isVideo && !isImage) {
      toast.error('Please select an image or video file');
      e.target.value = '';
      return;
    }
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

  const saveLocalDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, location, tags, type }));
    toast.success('Draft saved locally!');
  };

  const submitCore = async (saveAsDraft: boolean): Promise<void> => {
    if (!db) {
      toast.error('Database not initialized');
      return;
    }
    if (!user || !userProfile) {
      toast.error('Sign in to continue');
      return;
    }

    const titleTrim = title.trim();
    const contentTrim = content.trim();
    const locationTrim = location.trim();
    const tagsTrim = tags.trim();

    if (!titleTrim) {
      toast.error('Please enter a title');
      return;
    }
    if (!contentTrim) {
      toast.error('Please enter some content');
      return;
    }

    if ((type === 'photo' || type === 'video') && !isCloudinaryConfigured()) {
      toast.error('Media uploads are not configured (Cloudinary).');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let mediaType: MediaType | undefined;

      if (media) {
        const isVid = VIDEO_MIME.test(media.type);
        setProgress(5);
        if (isVid) {
          videoUrl = await uploadVideo(media, (pct) => setProgress(Math.min(90, pct)));
          mediaType = 'video';
        } else {
          imageUrl = await uploadToCloudinary(media, 'image');
          setProgress(90);
          mediaType = 'image';
        }
      }

      setProgress(95);

      const tagsArray = tagsTrim ? tagsTrim.split(',').map((t) => t.trim()).filter(Boolean) : [];

      const now = Date.now();
      const ttlMs = 24 * 60 * 60 * 1000;

      const payload: PostDoc = {
        type: type === 'photo' ? 'writing' : type,
        mediaType: mediaType || (type === 'video' ? 'video' : 'image'),
        title: titleTrim,
        content: contentTrim,
        preview: contentTrim.substring(0, 220),
        location: locationTrim || null,
        tags: tagsArray,
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username ?? null,
        authorPhoto: userProfile.photoURL ?? null,
        imageUrl,
        videoUrl,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        isOfficial: isAdmin ? isOfficial : false,
        isDraft: saveAsDraft,
        expiresAt: saveAsDraft ? Timestamp.fromMillis(now + ttlMs) : null,
        updatedAt: serverTimestamp(),
      };

      if (!editId) {
        payload.createdAt = serverTimestamp();
        const newRef = await addDoc(collection(db, 'posts'), payload);
        setProgress(100);
        localStorage.removeItem(DRAFT_KEY);
        toast.success(saveAsDraft ? 'Draft saved!' : 'Post published!');
        router.push(saveAsDraft ? '/dashboard/drafts' : `/posts/${newRef.id}`);
      } else {
        const ref = fsDoc(db, 'posts', editId);
        await updateDoc(ref, payload as Partial<PostDoc>);
        setProgress(100);
        toast.success(saveAsDraft ? 'Draft updated!' : 'Post updated!');
        router.push(saveAsDraft ? '/dashboard/drafts' : `/posts/${editId}`);
      }
    } catch (err: unknown) {
      console.error('Submit error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitCore(false);
  };

  const onSaveDraftClick = async () => {
    await submitCore(true);
  };

  return (
    <AuthGuard>
      <Layout title={`${editId ? 'Edit' : 'Create'} Post - PattiBytes`}>
        <div className={styles.page}>
          <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className={styles.header}>
              <h1>{editId ? 'Edit Post' : 'Create Post'}</h1>
              <div className={styles.headerActions}>
                {!editId && (
                  <button
                    type="button"
                    onClick={saveLocalDraft}
                    className={styles.draftBtn}
                    disabled={uploading}
                    aria-label="Save local draft"
                  >
                    <FaSave /> Save Local Draft
                  </button>
                )}
                <Link href="/dashboard/drafts" className={styles.draftsLink} aria-label="Open drafts">
                  <FaFolderOpen /> Drafts
                </Link>
              </div>
            </div>

            {loadingEdit ? (
              <p className={styles.loadingText}>Loading...</p>
            ) : (
              <form onSubmit={onSubmitForm} className={styles.form}>
                <div className={styles.typeSelector}>
                  <label>Post Type</label>
                  <div className={styles.types}>
                    <button type="button" className={type === 'writing' ? styles.active : ''} onClick={() => setType('writing')} disabled={uploading}>
                      <FaPen /> Writing
                    </button>
                    <button type="button" className={type === 'photo' ? styles.active : ''} onClick={() => setType('photo')} disabled={uploading}>
                      <FaImage /> Photo
                    </button>
                    <button type="button" className={type === 'video' ? styles.active : ''} onClick={() => setType('video')} disabled={uploading}>
                      <FaVideo /> Video
                    </button>
                    <button type="button" className={type === 'news' ? styles.active : ''} onClick={() => setType('news')} disabled={uploading}>
                      <FaNewspaper /> News
                    </button>
                    <button type="button" className={type === 'place' ? styles.active : ''} onClick={() => setType('place')} disabled={uploading}>
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
                    className={styles.input}
                  />
                  <small>{title.length}/120</small>
                </div>

                <div className={styles.formGroup}>
                  <label>Content *</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your content here..."
                    rows={12}
                    required
                    disabled={uploading}
                    maxLength={5000}
                    className={styles.textarea}
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
                      className={styles.input}
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="travel, food, tech..."
                    disabled={uploading}
                    className={styles.input}
                  />
                </div>

                {isAdmin && (
                  <div className={styles.formGroup}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={isOfficial}
                        onChange={(e) => setIsOfficial(e.target.checked)}
                        disabled={uploading}
                      />
                      <span>Mark as Official Post</span>
                    </label>
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
                    <button type="button" className={styles.uploadBtn} onClick={openPicker} disabled={uploading}>
                      <FaImage /> Choose Media
                    </button>
                  ) : (
                    <div className={styles.imagePreview}>
                      {type === 'video' ? (
                        <video src={mediaPreview} controls className={styles.previewVideo} />
                      ) : (
                        <SafeImage src={mediaPreview} alt="Preview" width={600} height={400} className={styles.previewImage} />
                      )}
                      <button type="button" className={styles.removeBtn} onClick={removeMedia} disabled={uploading}>
                        <FaTimes /> Remove
                      </button>
                    </div>
                  )}
                  <small>Images up to {MAX_IMAGE_MB}MB, videos up to {MAX_VIDEO_MB}MB</small>
                </div>

                {uploading && (
                  <div className={styles.progressBar} role="status" aria-live="polite">
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                    <span>{progress}%</span>
                  </div>
                )}

                <div className={styles.actions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => router.back()} disabled={uploading}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.draftSubmitBtn}
                    onClick={onSaveDraftClick}
                    disabled={uploading || !title.trim() || !content.trim()}
                  >
                    <FaSave /> {editId ? 'Update Draft' : 'Save as Draft'}
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={uploading || !title.trim() || !content.trim()}>
                    <FaPaperPlane /> {editId ? 'Update & Publish' : 'Publish Post'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
