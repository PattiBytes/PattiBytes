import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, limit, query, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaPlus } from 'react-icons/fa';
import styles from '@/styles/BytesStories.module.css';

interface StoryDoc {
  userId: string;
  userName: string;
  userPhoto?: string | null;
  imageUrl: string;
  createdAt?: Timestamp;
}

interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  imageUrl: string;
  createdAt: Date;
}

export default function StoriesBar() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const load = async () => {
      const { db } = getFirebaseClient();
      if (!db) return;

      // Load latest 50, then filter last 24h to avoid composite index requirements
      const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const now = Date.now();
      const last24h = 24 * 60 * 60 * 1000;

      const data: Story[] = snap.docs
        .map((d) => {
          const s = d.data() as StoryDoc;
          const created = s.createdAt?.toDate?.() || new Date();
          return {
            id: d.id,
            userId: s.userId,
            userName: s.userName || 'User',
            userPhoto: s.userPhoto || '/images/default-avatar.png',
            imageUrl: s.imageUrl,
            createdAt: created,
          };
        })
        .filter((s) => now - s.createdAt.getTime() < last24h);

      setStories(data);
    };
    load();
  }, []);

  return (
    <div className={styles.stories}>
      <Link href="/stories/create" className={styles.addStory}>
        <div className={styles.addCircle}>
          <FaPlus />
        </div>
        <span>Your Story</span>
      </Link>

      <div className={styles.storiesList}>
        {stories.map((story, index) => (
          <motion.div
            key={story.id}
            className={styles.story}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link href={`/stories/${story.id}`}>
              <div className={styles.storyRing}>
                <SafeImage
                  src={story.userPhoto}
                  alt={story.userName}
                  width={56}
                  height={56}
                  className={styles.storyAvatar}
                />
              </div>
              <span>{story.userName.split(' ')[0]}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
