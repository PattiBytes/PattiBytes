import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import SafeImage from './SafeImage';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTimes, FaCamera, FaVideo } from 'react-icons/fa';
import styles from '@/styles/BytesStories.module.css';

interface Byte {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: Date;
  expiresAt: Date;
  views: string[];
}

interface Author {
  id: string;
  name: string;
  username: string;
  photo: string;
}

interface GroupedByte {
  author: Author;
  bytes: Byte[];
}

export default function BytesStories() {
  const { user, userProfile } = useAuth();
  const [bytes, setBytes] = useState<Byte[]>([]);
  const [selectedByte, setSelectedByte] = useState<Byte | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBytes();
  }, []);

  const loadBytes = async () => {
    try {
      const { db } = getFirebaseClient();
      if (!db) return;

      const now = new Date();
      const bytesQuery = query(
        collection(db, 'bytes'),
        where('expiresAt', '>', Timestamp.fromDate(now)),
        orderBy('expiresAt'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(bytesQuery);
      const loadedBytes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      })) as Byte[];

      setBytes(loadedBytes);
    } catch (error) {
      console.error('Error loading bytes:', error);
    }
  };

  const handleUpload = async (file: File, type: 'image' | 'video') => {
    if (!user || !userProfile) return;

    setUploading(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration missing');
      }

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      
      // Save to Firestore
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await addDoc(collection(db, 'bytes'), {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL,
        mediaUrl: data.secure_url,
        mediaType: type,
        caption: '',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        views: []
      });

      setShowUpload(false);
      loadBytes();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Group bytes by user
  const groupedBytes = bytes.reduce<Record<string, GroupedByte>>((acc, byte) => {
    if (!acc[byte.authorId]) {
      acc[byte.authorId] = {
        author: {
          id: byte.authorId,
          name: byte.authorName,
          username: byte.authorUsername,
          photo: byte.authorPhoto
        },
        bytes: []
      };
    }
    acc[byte.authorId].bytes.push(byte);
    return acc;
  }, {});

  return (
    <>
      <div className={styles.bytesContainer}>
        <div className={styles.storiesScroll}>
          {/* Add New Byte */}
          <div className={styles.storyItem} onClick={() => setShowUpload(true)}>
            <div className={`${styles.storyRing} ${styles.addNew}`}>
              <div className={styles.avatar}>
                <SafeImage src={user?.photoURL} alt="You" width={56} height={56} />
                <div className={styles.addIcon}>
                  <FaPlus />
                </div>
              </div>
            </div>
            <span className={styles.storyName}>Your Byte</span>
          </div>

          {/* User Bytes */}
          {Object.values(groupedBytes).map(({ author, bytes: userBytes }) => (
            <div 
              key={author.id}
              className={styles.storyItem}
              onClick={() => setSelectedByte(userBytes[0])}
            >
              <div className={styles.storyRing}>
                <div className={styles.avatar}>
                  <SafeImage src={author.photo} alt={author.name} width={56} height={56} />
                </div>
              </div>
              <span className={styles.storyName}>{author.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div 
            className={styles.uploadModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.uploadContent}>
              <button className={styles.closeBtn} onClick={() => setShowUpload(false)}>
                <FaTimes />
              </button>
              <h2>Upload Byte</h2>
              <div className={styles.uploadOptions}>
                <label className={styles.uploadOption}>
                  <FaCamera />
                  <span>Photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'image')}
                    disabled={uploading}
                  />
                </label>
                <label className={styles.uploadOption}>
                  <FaVideo />
                  <span>Video</span>
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'video')}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && <p className={styles.uploading}>Uploading...</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Byte Viewer */}
      <AnimatePresence>
        {selectedByte && (
          <motion.div 
            className={styles.byteViewer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedByte(null)}
          >
            <button className={styles.closeBtn} onClick={() => setSelectedByte(null)}>
              <FaTimes />
            </button>
            {selectedByte.mediaType === 'image' ? (
              <SafeImage 
                src={selectedByte.mediaUrl} 
                alt="Byte" 
                width={800}
                height={800}
                className={styles.byteMedia}
              />
            ) : (
              <video src={selectedByte.mediaUrl} controls autoPlay className={styles.byteMedia} />
            )}
            <div className={styles.byteInfo}>
              <SafeImage src={selectedByte.authorPhoto} alt={selectedByte.authorName} width={40} height={40} />
              <div>
                <strong>{selectedByte.authorName}</strong>
                <span>{new Date(selectedByte.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
