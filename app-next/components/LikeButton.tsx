// app-next/components/LikeButton.tsx
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { togglePostLike } from '@/lib/likes';
import { FaHeart } from 'react-icons/fa';
import styles from '@/styles/Social.module.css';

type Props = { postId: string; className?: string; showCount?: boolean; ariaLabel?: string };

export default function LikeButton({ postId, className, showCount = true, ariaLabel = 'Like' }: Props) {
  const { user } = useAuth();
  const { db } = getFirebaseClient();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const likeRef = useMemo(
    () => (db && user ? doc(db, 'posts', postId, 'likes', user.uid) : null),
    [db, user, postId]
  );
  const postRef = useMemo(() => (db ? doc(db, 'posts', postId) : null), [db, postId]);

  useEffect(() => {
    if (!postRef) return;
    const unsub = onSnapshot(postRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { likesCount?: number };
      if (typeof data.likesCount === 'number') setCount(data.likesCount);
    });
    return () => unsub();
  }, [postRef]);

  useEffect(() => {
    const run = async () => {
      if (!likeRef) return;
      const s = await getDoc(likeRef);
      setLiked(s.exists());
    };
    run();
  }, [likeRef]);

  const toggle = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => (c == null ? c : c + (next ? 1 : -1)));
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    try {
      await togglePostLike(postId, user.uid, next);
    } catch {
      setLiked(!next);
      setCount((c) => (c == null ? c : c + (next ? -1 : 1)));
      alert('Unable to update like. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className || styles.pill}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={!user}
      style={{ position: 'relative' }}
    >
      <span className={styles.icon} style={{ transform: animating ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.3s ease' }}>
        <FaHeart style={{ color: liked ? '#ef4444' : '#6b7280' }} />
      </span>
      {showCount && <span className={styles.count}>{count ?? 0}</span>}
    </button>
  );
}
