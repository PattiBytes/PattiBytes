// app-next/components/FollowingModal.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { getFirebaseClient } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, limit, query as fsQuery } from 'firebase/firestore';
import type { UserProfile } from '@/lib/username';
import styles from '@/styles/UserProfile.module.css';

interface FollowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function FollowingModal({ isOpen, onClose, userId }: FollowingModalProps) {
  const { db } = getFirebaseClient();
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!isOpen || !db || !userId) return;

    const load = async () => {
      setLoading(true);
      try {
        const col = collection(db, 'users', userId, 'following');
        const snap = await getDocs(fsQuery(col, limit(50)));

        const profiles: UserProfile[] = [];
        for (const d of snap.docs) {
          const uref = doc(db, 'users', d.id);
          const usnap = await getDoc(uref);
          if (usnap.exists()) {
            profiles.push({ uid: d.id, ...(usnap.data() as Omit<UserProfile, 'uid'>) });
          }
        }
        setFollowing(profiles);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, db, userId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modal}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.modalPanel}
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <div className={styles.modalHeader}>
            <h3>Following</h3>
            <button onClick={onClose}>×</button>
          </div>
          <div className={styles.modalContent}>
            {loading ? (
              <div className={styles.modalEmpty}>Loading following...</div>
            ) : following.length === 0 ? (
              <div className={styles.modalEmpty}>Not following anyone yet</div>
            ) : (
              following.map((u) => (
                <Link href={`/user/${u.username}`} key={u.uid} className={styles.modalUser} onClick={onClose}>
                  <SafeImage
                    src={u.photoURL || '/images/default-avatar.png'}
                    alt={u.displayName}
                    width={40}
                    height={40}
                  />
                  <div>
                    <div className={styles.modalUserName}>{u.displayName}</div>
                    <div className={styles.modalUserUsername}>@{u.username}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
