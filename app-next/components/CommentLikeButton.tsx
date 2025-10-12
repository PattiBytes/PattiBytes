// app-next/components/CommentLikeButton.tsx
import { useEffect, useMemo, useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, setDoc, deleteDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { FaHeart } from 'react-icons/fa';

type Props = { postId: string; commentId: string; className?: string; isCMS?: boolean };

export default function CommentLikeButton({ postId, commentId, className, isCMS = false }: Props) {
  const { user } = useAuth();
  const { db } = getFirebaseClient();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const commentPath = useMemo(
    () => isCMS ? `globalComments/${commentId}` : `posts/${postId}/comments/${commentId}`,
    [isCMS, postId, commentId]
  );

  const likeRef = useMemo(
    () => (db && user ? doc(db, `${commentPath}/likes`, user.uid) : null),
    [db, user, commentPath]
  );

  const commentRef = useMemo(() => (db ? doc(db, commentPath) : null), [db, commentPath]);

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
    if (!user || !db || !commentRef || !likeRef) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => (c == null ? c : c + (next ? 1 : -1)));
    try {
      if (next) {
        await setDoc(likeRef, { uid: user.uid, createdAt: serverTimestamp() });
        await updateDoc(commentRef, { likesCount: increment(1) });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(commentRef, { likesCount: increment(-1) });
      }
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
