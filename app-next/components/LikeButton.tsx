import { useEffect, useMemo, useState } from 'react';
import { getFirebaseClient } from '@/lib/firebase';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { togglePostLike } from '@/lib/likes';
import { FaHeart } from 'react-icons/fa';
import styles from '@/styles/Social.module.css';

type Props = {
  postId: string;
  className?: string;
  showCount?: boolean;
  ariaLabel?: string;
};

type CmsStatsDoc = {
  postId: string;
  likesCount?: number;
  updatedAt?: unknown;
};

type FirebaseWriteError = { code?: string; message?: string };
function isFirebaseWriteError(e: unknown): e is FirebaseWriteError {
  return typeof e === 'object' && e !== null && ('code' in e || 'message' in e);
}

function cmsLikeDocId(postId: string, uid: string) {
  // Keep it deterministic and safe for doc id
  return `${postId}__${uid}`;
}

async function toggleCmsLike(args: {
  db: Firestore;
  postId: string;
  uid: string;
  next: boolean;
}): Promise<void> {
  const { db, postId, uid, next } = args;

  const statsRef = doc(db, 'cmsShares', postId) as DocumentReference<CmsStatsDoc>;
  const likeRef = doc(db, 'globalLikes', cmsLikeDocId(postId, uid));

  await runTransaction(db, async (tx) => {
    const [statsSnap, likeSnap] = await Promise.all([tx.get(statsRef), tx.get(likeRef)]);

    const currentLikes =
      statsSnap.exists() && typeof statsSnap.data().likesCount === 'number'
        ? (statsSnap.data().likesCount as number)
        : 0;

    if (next) {
      if (!likeSnap.exists()) {
        tx.set(likeRef, { uid, postId, createdAt: serverTimestamp() }, { merge: true });
      }
      tx.set(
        statsRef,
        { postId, likesCount: currentLikes + 1, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } else {
      if (likeSnap.exists()) tx.delete(likeRef);
      tx.set(
        statsRef,
        { postId, likesCount: Math.max(0, currentLikes - 1), updatedAt: serverTimestamp() },
        { merge: true },
      );
    }
  });
}

export default function LikeButton({
  postId,
  className,
  showCount = true,
  ariaLabel = 'Like',
}: Props) {
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const isCMS = useMemo(() => postId.startsWith('cms-'), [postId]);

  // For normal posts -> /posts/{postId}
  // For CMS posts    -> /cmsShares/{postId}
  const statsRef = useMemo(() => {
    if (!db) return null;
    return isCMS ? doc(db, 'cmsShares', postId) : doc(db, 'posts', postId);
  }, [db, postId, isCMS]);

  // For normal posts -> /posts/{postId}/likes/{uid}
  // For CMS posts    -> /globalLikes/{postId__uid}
  const likeRef = useMemo(() => {
    if (!db || !user) return null;
    return isCMS
      ? doc(db, 'globalLikes', cmsLikeDocId(postId, user.uid))
      : doc(db, 'posts', postId, 'likes', user.uid);
  }, [db, user, postId, isCMS]);

  // Subscribe to count ONLY when signed-in (prevents permission-denied snapshot crashes)
  useEffect(() => {
    if (!statsRef || !user) return;

    const unsub = onSnapshot(
      statsRef,
      (snap) => {
        if (!snap.exists()) {
          setCount(0);
          return;
        }
        const data = snap.data() as { likesCount?: number };
        setCount(typeof data.likesCount === 'number' ? data.likesCount : 0);
      },
      (err) => {
        console.warn('LikeButton snapshot error:', err);
        setCount(0);
      },
    );

    return () => unsub();
  }, [statsRef, user]);

  // Load liked state
  useEffect(() => {
    const run = async () => {
      if (!likeRef) return;
      try {
        const s = await getDoc(likeRef);
        setLiked(s.exists());
      } catch (err) {
        console.warn('LikeButton getDoc error:', err);
        setLiked(false);
      }
    };
    void run();
  }, [likeRef]);

  const toggle = async () => {
    if (!user || !db) return;

    const next = !liked;
    setLiked(next);
    setCount((c) => {
      const base = typeof c === 'number' ? c : 0;
      return base + (next ? 1 : -1);
    });

    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    try {
      if (isCMS) {
        await toggleCmsLike({ db, postId, uid: user.uid, next });
      } else {
        await togglePostLike(postId, user.uid, next);
      }
    } catch (err) {
      const code = isFirebaseWriteError(err) ? err.code : undefined;

      // rollback
      setLiked(!next);
      setCount((c) => {
        const base = typeof c === 'number' ? c : 0;
        return base + (next ? -1 : 1);
      });

      alert(code === 'permission-denied' ? 'Permission denied.' : 'Unable to update like. Please try again.');
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
      <span
        className={styles.icon}
        style={{
          transform: animating ? 'scale(1.3)' : 'scale(1)',
          transition: 'transform 0.3s ease',
        }}
      >
        <FaHeart style={{ color: liked ? '#ef4444' : '#6b7280' }} />
      </span>

      {showCount && <span className={styles.count}>{count ?? 0}</span>}
    </button>
  );
}
