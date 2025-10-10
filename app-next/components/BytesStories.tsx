// components/BytesStories.tsx
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, limit, query, Timestamp, doc, getDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaPlus } from 'react-icons/fa';
import styles from '@/styles/BytesStories.module.css';

interface ByteDoc {
  userId: string;
  userName: string;
  userPhoto?: string | null;
  imageUrl: string;
  createdAt?: Timestamp;
}

interface Byte {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  imageUrl: string;
  createdAt: Date;
}

interface UserDoc {
  username?: string;
}

export default function BytesStories() {
  const [bytes, setBytes] = useState<Byte[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { db } = getFirebaseClient();
      if (!db) return;

      const q = query(collection(db, 'bytes'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const now = Date.now();
      const last24h = 24 * 60 * 60 * 1000;

      const seen = new Set<string>();
      const data: Byte[] = snap.docs
        .map((d) => {
          const b = d.data() as ByteDoc;
          const created = b.createdAt?.toDate?.() || new Date();
          return {
            id: d.id,
            userId: b.userId,
            userName: b.userName || 'User',
            userPhoto: b.userPhoto || '/images/default-avatar.png',
            imageUrl: b.imageUrl,
            createdAt: created,
          };
        })
        .filter((b) => {
          if (now - b.createdAt.getTime() >= last24h) return false;
          if (seen.has(b.userId)) return false;
          seen.add(b.userId);
          return true;
        });

      setBytes(data);

      // hydrate usernames for avatar → profile link
      const need = data.map((b) => b.userId).filter((uid) => !usernames[uid]);
      const next: Record<string, string> = {};
      for (const uid of need) {
        try {
          const uref = doc(db, 'users', uid);
          const u = await getDoc(uref);
          if (u.exists()) {
            const udata = u.data() as UserDoc;
            if (typeof udata?.username === 'string' && udata.username) {
              next[uid] = udata.username;
            }
          }
        } catch {
          // ignore
        }
      }
      if (Object.keys(next).length) {
        setUsernames((prev) => ({ ...prev, ...next }));
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bytes.length === 0) {
    return (
      <div className={styles.stories}>
        <Link href="/bytes/create" className={styles.addStory}>
          <div className={styles.addCircle}>
            <FaPlus />
          </div>
          <span>Your Byte</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.stories}>
      <Link href="/bytes/create" className={styles.addStory}>
        <div className={styles.addCircle}>
          <FaPlus />
        </div>
        <span>Your Byte</span>
      </Link>

      <div className={styles.storiesList}>
        {bytes.map((byte, index) => {
          const profileHref = usernames[byte.userId] ? `/user/${usernames[byte.userId]}` : undefined;

          return (
            <motion.div
              key={byte.id}
              className={styles.story}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className={styles.storyRing}>
                {profileHref ? (
                  <Link href={profileHref} className={styles.profileTap} title={byte.userName}>
                    <SafeImage
                      src={byte.userPhoto}
                      alt={byte.userName}
                      width={56}
                      height={56}
                      className={styles.storyAvatar}
                    />
                  </Link>
                ) : (
                  <SafeImage
                    src={byte.userPhoto}
                    alt={byte.userName}
                    width={56}
                    height={56}
                    className={styles.storyAvatar}
                  />
                )}
              </div>

              <Link href={`/bytes/${byte.id}`} className={styles.storyName}>
                <span>{byte.userName.split(' ')[0]}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
