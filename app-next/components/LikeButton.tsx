// components/LikeButton.tsx
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { FaHeart } from 'react-icons/fa';

type PostLikeCounters = {
  counters?: { likes?: number };
  likesCount?: number;
};

type Props = {
  postId: string;
  className?: string;
};

export default function LikeButton({ postId, className }: Props) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const { db } = getFirebaseClient();
  const likeRef = useMemo(
    () => (db && user ? doc(db, 'posts', postId, 'likes', user.uid) : null),
    [db, user, postId]
  );
  const postRef = useMemo(() => (db ? doc(db, 'posts', postId) : null), [db, postId]);

  useEffect(() => {
    if (!db || !postRef) return;
    const unsub = onSnapshot(postRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PostLikeCounters;
        const c = data?.counters?.likes ?? data?.likesCount;
        if (typeof c === 'number') setCount(c);
      }
    });
    return () => unsub();
  }, [db, postRef]);

  useEffect(() => {
    const check = async () => {
      if (!likeRef) return;
      const snap = await getDoc(likeRef);
      setLiked(snap.exists());
    };
    check();
  }, [likeRef]);

  const toggle = async () => {
    if (!db || !user || !likeRef) return;
    setLiked((v) => !v);
    setCount((c) => (c == null ? c : c + (liked ? -1 : 1)));
    try {
      if (liked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { createdAt: serverTimestamp(), uid: user.uid });
      }
    } catch {
      setLiked((v) => !v);
      setCount((c) => (c == null ? c : c + (liked ? 1 : -1)));
    }
  };

  const label = `${count ?? ''} ${count === 1 ? 'Like' : 'Likes'}`;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label="Like"
      className={className}
      disabled={!user}
      title={user ? label : 'Sign in to like'}
    >
      <FaHeart style={{ color: liked ? '#ef4444' : '#6b7280', marginRight: 6 }} />
      <span>{label}</span>
    </button>
  );
}
