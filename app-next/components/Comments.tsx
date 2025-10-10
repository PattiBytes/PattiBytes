// components/Comments.tsx
import { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import SafeImage from '@/components/SafeImage';
import styles from '@/styles/Comments.module.css';

interface CommentDoc {
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  text: string;
  createdAt?: { toDate?: () => Date };
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  text: string;
  createdAt: Date;
}

export default function Comments({ postId, onCountChange }: { postId: string; onCountChange?: (n: number) => void }) {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const { db } = getFirebaseClient();
    if (!db) return;
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const list: Comment[] = snap.docs.map((d) => {
        const data = d.data() as CommentDoc;
        const when = data.createdAt?.toDate?.() || new Date();
        return {
          id: d.id,
          authorId: data.authorId,
          authorName: data.authorName || 'User',
          authorPhoto: data.authorPhoto ?? '/images/default-avatar.png',
          text: data.text || '',
          createdAt: when,
        };
      });
      setComments(list);
      onCountChange?.(list.length);
    });
    return () => unsub();
  }, [postId, onCountChange]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { db } = getFirebaseClient();
    if (!db || !user || !userProfile) return;
    try {
      setSending(true);
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL || '/images/default-avatar.png',
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.comments} id="comments">
      <h3>Comments</h3>
      <form onSubmit={send} className={styles.inputRow}>
        <SafeImage
          src={userProfile?.photoURL || '/images/default-avatar.png'}
          alt="You"
          width={36}
          height={36}
          className={styles.avatar}
        />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment..." disabled={sending} />
        <button type="submit" disabled={sending || !text.trim()}>
          Post
        </button>
      </form>

      <div className={styles.list}>
        {comments.map((c) => (
          <div key={c.id} className={styles.item}>
            <SafeImage
              src={c.authorPhoto || '/images/default-avatar.png'}
              alt={c.authorName}
              width={32}
              height={32}
              className={styles.avatar}
            />
            <div className={styles.bubble}>
              <div className={styles.meta}>
                <strong>{c.authorName}</strong>
                <span>{c.createdAt.toLocaleString()}</span>
              </div>
              <p>{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
