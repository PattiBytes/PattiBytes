// app-next/pages/bytes/create.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isCloudinaryConfigured } from '@/lib/cloudinary';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import UploadButton from '@/components/UploadButton';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaImage, FaVideo } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/CreateByte.module.css';

export default function CreateBytePage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { db } = getFirebaseClient();
  const [isUploading, setIsUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textPosition, setTextPosition] =
    useState<'top' | 'middle' | 'bottom'>('bottom');

  const handleUploadComplete = (url: string, type: 'image' | 'video') => {
    setMediaUrl(url);
    setMediaType(type);
    toast.success(`${type} uploaded!`);
  };

  const handlePost = async () => {
    if (!db || !user || !userProfile) {
      toast.error('Not authenticated');
      return;
    }

    if (!mediaUrl) {
      toast.error('Please upload an image or video');
      return;
    }

    try {
      setIsUploading(true);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const byteData: Record<string, unknown> = {
        userId: user.uid,
        userName: userProfile.displayName || 'User',
        userPhoto: userProfile.photoURL || null,
        mediaUrl,
        mediaType,
        createdAt: serverTimestamp(),
        expiresAt,
      };

      // Add text overlay data if text exists
      if (text.trim()) {
        byteData.text = text.trim();
        byteData.textColor = textColor;
        byteData.textPosition = textPosition;
      }

      const docRef = await addDoc(collection(db, 'bytes'), byteData);

      toast.success('Byte posted!');
      setMediaUrl(null);
      setText('');

      setTimeout(() => {
        router.push(`/bytes/${docRef.id}`);
      }, 800);
    } catch (error) {
      console.error('Error creating byte:', error);
      toast.error('Failed to post byte');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Create Byte - PattiBytes">
        <div className={styles.container}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => router.back()}
              className={styles.backBtn}
            >
              <FaArrowLeft /> Back
            </button>
            <div>
              <h1>Create Byte</h1>
              <p>Share a moment that disappears in 24 hours</p>
            </div>
          </motion.div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {!isCloudinaryConfigured() ? (
              <div className={styles.error}>
                <p>Cloudinary is not configured. Contact admin.</p>
              </div>
            ) : (
              <>
                {!mediaUrl ? (
                  <div className={styles.uploadSection}>
                    <div className={styles.uploadOptions}>
                      <UploadButton
                        onUploadComplete={(url) =>
                          handleUploadComplete(url, 'image')
                        }
                        accept="image/*"
                        maxSize={10}
                        buttonText="Upload Image"
                        showPreview={true}
                      />
                      <UploadButton
                        onUploadComplete={(url) =>
                          handleUploadComplete(url, 'video')
                        }
                        accept="video/*"
                        maxSize={50}
                        buttonText="Upload Video"
                        showPreview={false}
                      />
                    </div>

                    <div className={styles.info}>
                      <h3>📸 Byte Guidelines</h3>
                      <ul>
                        <li>
                          <FaImage /> Images: Max 10MB (JPG, PNG, WebP)
                        </li>
                        <li>
                          <FaVideo /> Videos: Max 50MB (MP4, WebM)
                        </li>
                        <li>Expires after 24 hours</li>
                        <li>One byte per user at a time</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className={styles.editorSection}>
                    <div className={styles.preview}>
                      {mediaType === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl}
                          alt="Preview"
                          className={styles.previewMedia}
                        />
                      ) : (
                        <video
                          src={mediaUrl}
                          controls
                          className={styles.previewMedia}
                        />
                      )}

                      {text && (
                        <div
                          className={`${styles.textOverlay} ${styles[`text_${textPosition}`]}`}
                          style={{ color: textColor }}
                        >
                          {text}
                        </div>
                      )}
                    </div>

                    <div className={styles.textEditor}>
                      <h3>Add Text (Optional)</h3>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Add text to your byte..."
                        maxLength={200}
                        className={styles.textInput}
                      />
                      <small>
                        {text.length}/200
                      </small>

                      <div className={styles.textControls}>
                        <div className={styles.control}>
                          <label>Text Color</label>
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className={styles.colorPicker}
                          />
                        </div>

                        <div className={styles.control}>
                          <label>Text Position</label>
                          <select
                            value={textPosition}
                            onChange={(e) =>
                              setTextPosition(
                                e.target.value as
                                  | 'top'
                                  | 'middle'
                                  | 'bottom',
                              )
                            }
                            className={styles.select}
                          >
                            <option value="top">Top</option>
                            <option value="middle">Middle</option>
                            <option value="bottom">Bottom</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button
                          onClick={() => setMediaUrl(null)}
                          className={styles.changeBtn}
                          disabled={isUploading}
                        >
                          Change Media
                        </button>
                        <button
                          onClick={handlePost}
                          className={styles.postBtn}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Posting...' : 'Post Byte'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
