// app-next/components/BytesGallery.tsx
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  limit,
  query,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import SafeImage from '@/components/SafeImage';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FaPlus, FaPlay } from 'react-icons/fa';
import styles from '@/styles/BytesGallery.module.css';

interface ByteItem {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Date;
  expiresAt: Date;
}

export default function BytesGallery() {
  const router = useRouter();
  const [bytes, setBytes] = useState<ByteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { db } = getFirebaseClient();
      if (!db) return;

      try {
        const q = query(
          collection(db, 'bytes'),
          orderBy('createdAt', 'desc'),
          limit(50),
        );
        const snap = await getDocs(q);
        const now = new Date();

        const seen = new Set<string>();
        const data: ByteItem[] = snap.docs
          .map((d) => {
            const b = d.data();
            const created =
              (b.createdAt as Timestamp)?.toDate?.() ||
              new Date();
            const expires =
              (b.expiresAt as Timestamp)?.toDate?.() ||
              new Date();
            return {
              id: d.id,
              userId: b.userId,
              userName: b.userName || 'User',
              userPhoto:
                b.userPhoto || '/images/default-avatar.png',
              mediaUrl: b.mediaUrl,
              mediaType: b.mediaType || 'image',
              createdAt: created,
              expiresAt: expires,
            };
          })
          .filter((b) => {
            if (b.expiresAt <= now) return false;
            if (seen.has(b.userId)) return false;
            seen.add(b.userId);
            return true;
          });

        setBytes(data);
      } catch (error) {
        console.error('Error loading bytes:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
     
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.loadingSkeleton} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {bytes.length === 0 ? (
        <div className={styles.empty}>
          <p>No bytes yet. Be the first to share!</p>
          <button
            onClick={() => router.push('/bytes/create')}
            className={styles.createBtn}
          >
            <FaPlus /> Create Byte
          </button>
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <h2>Bytes</h2>
            <button
              onClick={() => router.push('/bytes/create')}
              className={styles.createIcon}
            >
              <FaPlus />
            </button>
          </div>

          <div className={styles.grid}>
            {bytes.map((byte, index) => (
              <motion.div
                key={byte.id}
                className={styles.byteCard}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => router.push(`/bytes/${byte.id}`)}
                  className={styles.cardButton}
                >
                  <div className={styles.thumbnail}>
                    {byte.mediaType === 'video' ? (
                      <>
                        <SafeImage
                          src={byte.mediaUrl}
                          alt={byte.userName}
                          width={180}
                          height={280}
                          className={styles.media}
                        />
                        <div className={styles.videoOverlay}>
                          <FaPlay />
                        </div>
                      </>
                    ) : (
                      <SafeImage
                        src={byte.mediaUrl}
                        alt={byte.userName}
                        width={180}
                        height={280}
                        className={styles.media}
                      />
                    )}
                  </div>

                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      <SafeImage
                        src={byte.userPhoto}
                        alt={byte.userName}
                        width={40}
                        height={40}
                        className={styles.avatarImage}
                      />
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userName}>
                        {byte.userName}
                      </div>
                      <div className={styles.userTime}>
                        {getTimeAgo(byte.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
