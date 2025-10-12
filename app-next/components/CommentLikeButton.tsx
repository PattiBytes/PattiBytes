// app-next/components/CommentLikeButton.tsx
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { toggleCommentLike } from '@/lib/likes';
import { FaHeart } from 'react-icons/fa';

type Props = { postId: string; commentId: string; className?: string };

export default function CommentLikeButton({ postId, commentId, className }: Props) {
  const { user } = useAuth();
  const { db } = getFirebaseClient();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const likeRef = useMemo(
    () => (db && user ? doc(db, 'posts', postId, 'comments', commentId, 'likes', user.uid) : null),
    [db, user, postId, commentId]
  );
  const commentRef = useMemo(
    () => (db ? doc(db, 'posts', postId, 'comments', commentId) : null),
    [db, postId, commentId]
  );

  useEffect(() => {
    if (!commentRef) return;
    const unsub = onSnapshot(commentRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { likesCount?: number };
      if (typeof data.likesCount === 'number') setCount(data.likesCount);
    });
    return () => unsub();
  }, [commentRef]);

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
    try {
      await toggleCommentLike(postId, commentId, user.uid, next);
    } catch {
      setLiked(!next);
      setCount((c) => (c == null ? c : c + (next ? -1 : 1)));
      alert('Unable to update comment like. Please try again.');
    }
  };

  return (
    <button type="button" onClick={toggle} className={className} aria-label="Like comment" title="Like">
      <FaHeart style={{ color: liked ? '#ef4444' : '#6b7280', marginRight: 6 }} />
      <span>{count ?? ''}</span>
    </button>
  );
}
