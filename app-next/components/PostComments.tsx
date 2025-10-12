// app-next/components/PostComments.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query as fsQuery,
  limit,
  doc,
  updateDoc,
  getDocs,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import SafeImage from '@/components/SafeImage';
import CommentLikeButton from '@/components/CommentLikeButton';
import styles from '@/styles/Comments.module.css';
import Link from 'next/link';
import { addParentComment, addReply, deleteCommentTx } from '@/lib/comments';

type Props = { postId: string; onCountChange?: (n: number) => void; pageSize?: number };

type FsCommentDoc = {
  authorId: string;
  authorName: string;
  authorUsername?: string;
  authorPhoto?: string | null;
  text: string;
  createdAt?: Timestamp;
  parentId?: string | null;
  likesCount?: number;
  repliesCount?: number;
};

type FsComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername?: string;
  authorPhoto?: string | null;
  text: string;
  createdAt: Date;
  parentId?: string | null;
  likesCount?: number;
  repliesCount?: number;
};

type FirebaseWriteError = { code?: string; message?: string };
const isFirebaseWriteError = (e: unknown): e is FirebaseWriteError =>
  typeof e === 'object' && e !== null && ('code' in e || 'message' in e);

export default function PostComments({ postId, onCountChange, pageSize = 200 }: Props) {
  const { user, userProfile, isAdmin } = useAuth();
  const { db } = getFirebaseClient();

  const baseRef = useMemo(() => {
    if (!db) return null;
    const id = typeof postId === 'string' ? postId.trim() : '';
    if (!id) return null;
    return collection(db, 'posts', id, 'comments');
  }, [db, postId]);

  const [parents, setParents] = useState<FsComment[]>([]);
  const [replies, setReplies] = useState<Record<string, FsComment[]>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editText, setEditText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const lastParentDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreParents, setHasMoreParents] = useState(true);
  const [loadingParents, setLoadingParents] = useState(false);
  const replyUnsubs = useRef<Record<string, () => void>>({});

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const mapSnapToComment = (d: QueryDocumentSnapshot<DocumentData>): FsComment => {
    const data = d.data() as FsCommentDoc;
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    return {
      id: d.id,
      authorId: String(data.authorId || ''),
      authorName: String(data.authorName || 'User'),
      authorUsername: data.authorUsername || undefined,
      authorPhoto: data.authorPhoto ?? '/images/default-avatar.png',
      text: String(data.text || ''),
      createdAt,
      parentId: data.parentId || null,
      likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
      repliesCount: typeof data.repliesCount === 'number' ? data.repliesCount : 0,
    };
  };

  // Parent stream (requires composite index parentId asc + createdAt asc)
  useEffect(() => {
    if (!baseRef) return;
    setLoadingParents(true);
    const q = fsQuery(baseRef, where('parentId', '==', null), orderBy('createdAt', 'asc'), limit(pageSize));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(mapSnapToComment);
        setParents(list);
        onCountChange?.(snap.docs.length);
        lastParentDoc.current = snap.docs[snap.docs.length - 1] || null;
        setHasMoreParents(snap.docs.length >= pageSize);
        setLoadingParents(false);
      },
      (err) => {
        console.error('Parent comments stream error:', err);
        showToast('Unable to load comments', 'error');
        setLoadingParents(false);
      }
    );
    return () => unsub();
  }, [baseRef, onCountChange, pageSize]);

  // Paginate parents
  const loadMoreParents = async () => {
    if (!baseRef || !lastParentDoc.current || loadingParents || !hasMoreParents) return;
    setLoadingParents(true);
    try {
      const q = fsQuery(baseRef, where('parentId', '==', null), orderBy('createdAt', 'asc'), startAfter(lastParentDoc.current), limit(pageSize));
      const snap = await getDocs(q);
      const more = snap.docs.map(mapSnapToComment);
      setParents((prev) => [...prev, ...more]);
      lastParentDoc.current = snap.docs[snap.docs.length - 1] || null;
      setHasMoreParents(snap.docs.length >= pageSize);
    } catch (e) {
      console.error('Load more parents error:', e);
      showToast('Failed to load more', 'error');
    } finally {
      setLoadingParents(false);
    }
  };

  // Replies stream per parent
  const ensureRepliesStream = (parentId: string) => {
    if (!baseRef || replyUnsubs.current[parentId]) return;
    const q = fsQuery(baseRef, where('parentId', '==', parentId), orderBy('createdAt', 'asc'), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(mapSnapToComment);
        setReplies((prev) => ({ ...prev, [parentId]: list }));
      },
      (err) => {
        console.error('Replies stream error:', err);
      }
    );
    replyUnsubs.current[parentId] = unsub;
  };

  useEffect(() => {
    const unsubs = replyUnsubs.current;
    return () => {
      Object.values(unsubs).forEach((u) => u && u());
    };
  }, []);

  const ready = !!baseRef && !!user && !!userProfile?.displayName;

  // app-next/components/PostComments.tsx (excerpt where writes happen)
const send = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!ready || !text.trim() || !user || !userProfile) return;
  try {
    setSending(true);
    await addParentComment(postId, {
  authorId: user.uid,
  authorName: userProfile.displayName,
  authorUsername: userProfile.username ?? null,
  authorPhoto: userProfile.photoURL ?? null,
}, text);
    setText('');
    showToast('Comment posted!', 'success');
  } catch (err: unknown) {
    console.error('Post comment error:', err);
    const code = isFirebaseWriteError(err) ? err.code : undefined;
    showToast(code === 'permission-denied' ? 'Permission denied' : 'Failed to post comment', 'error');
  } finally {
    setSending(false);
  }
};

const sendReply = async (parentId: string) => {
  const value = replyText[parentId]?.trim();
  if (!ready || !value || !user || !userProfile) return;
  try {
    await addReply(postId, parentId, {
  authorId: user.uid,
  authorName: userProfile.displayName,
  authorUsername: userProfile.username ?? null,
  authorPhoto: userProfile.photoURL ?? null,
}, value);
    setReplyText((prev) => ({ ...prev, [parentId]: '' }));
    if (!replyUnsubs.current[parentId]) ensureRepliesStream(parentId);
    showToast('Reply posted!', 'success');
  } catch (err: unknown) {
    console.error('Post reply error:', err);
    const code = isFirebaseWriteError(err) ? err.code : undefined;
    showToast(code === 'permission-denied' ? 'Permission denied' : 'Failed to post reply', 'error');
  }
};

  const startEdit = (c: FsComment) => {
    setEditing((prev) => ({ ...prev, [c.id]: true }));
    setEditText((prev) => ({ ...prev, [c.id]: c.text }));
  };

  const saveEdit = async (c: FsComment) => {
    if (!baseRef) return;
    const val = editText[c.id]?.trim();
    if (!val) {
      setEditing((prev) => ({ ...prev, [c.id]: false }));
      return;
    }
    try {
      await updateDoc(doc(baseRef, c.id), { text: val, authorId: c.authorId });
      setEditing((prev) => ({ ...prev, [c.id]: false }));
      showToast('Comment updated!', 'success');
    } catch (err: unknown) {
      console.error('Edit comment error:', err);
      const code = isFirebaseWriteError(err) ? err.code : undefined;
      showToast(code === 'permission-denied' ? 'Permission denied' : 'Failed to update comment', 'error');
    }
  };

  const removeComment = async (c: FsComment) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteCommentTx(postId, c.id);
      showToast('Comment deleted', 'success');
    } catch (err) {
      console.error('Delete comment error:', err);
      showToast('Failed to delete comment', 'error');
    }
  };

  const canModify = (c: FsComment) => user?.uid === c.authorId || isAdmin;

  const CommentRow = ({ c }: { c: FsComment }) => {
    const profileHref = c.authorUsername ? `/user/${c.authorUsername}` : `/search?u=${encodeURIComponent(c.authorName)}`;
    const isEditing = editing[c.id];
    const isParent = !c.parentId;

    return (
      <div className={styles.item}>
        <Link href={profileHref} className={styles.avatarLink}>
          <SafeImage
            src={c.authorPhoto || '/images/default-avatar.png'}
            alt={c.authorName}
            width={32}
            height={32}
            className={styles.avatar}
          />
        </Link>
        <div className={styles.bubble}>
          <div className={styles.meta}>
            <Link href={profileHref}><strong>{c.authorName}</strong></Link>
            <span>{c.createdAt.toLocaleString()}</span>
          </div>

          {isEditing ? (
            <div className={styles.editRow}>
              <input
                value={editText[c.id] || ''}
                onChange={(e) => setEditText((p) => ({ ...p, [c.id]: e.target.value }))}
                aria-label="Edit comment"
              />
              <div className={styles.actionsSmall}>
                <button onClick={() => saveEdit(c)}>Save</button>
                <button onClick={() => setEditing((p) => ({ ...p, [c.id]: false }))}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className={styles.text}>{c.text}</p>
          )}

          <div className={styles.actionsSmall}>
            <CommentLikeButton postId={postId} commentId={c.id} className={styles.actionSm} />
            {isParent ? (
              <button
                className={styles.actionSm}
                onClick={() => {
                  setReplyOpen((p) => ({ ...p, [c.id]: !p[c.id] }));
                  if (!replies[c.id]) ensureRepliesStream(c.id);
                }}
                aria-expanded={!!replyOpen[c.id]}
              >
                Reply ({c.repliesCount || 0})
              </button>
            ) : null}
            {canModify(c) ? (
              <>
                <button className={styles.actionSm} onClick={() => startEdit(c)}>Edit</button>
                <button className={styles.actionSm} onClick={() => removeComment(c)}>Delete</button>
              </>
            ) : null}
          </div>

          {isParent && replyOpen[c.id] && (
            <div className={styles.replyRow}>
              <input
                placeholder="Write a reply..."
                value={replyText[c.id] || ''}
                onChange={(e) => setReplyText((p) => ({ ...p, [c.id]: e.target.value }))}
                aria-label="Reply text"
              />
              <button onClick={() => sendReply(c.id)} disabled={!replyText[c.id]?.trim()}>
                Reply
              </button>
            </div>
          )}

          <div className={styles.replies}>
            {(replies[c.id] || []).map((r) => (
              <CommentRow key={r.id} c={r} />
            ))}
            {!replies[c.id] && (c.repliesCount || 0) > 0 && (
              <button className={styles.loadReplies} onClick={() => ensureRepliesStream(c.id)}>
                View {c.repliesCount} {c.repliesCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
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
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={!ready ? 'Preparing…' : 'Write a comment...'}
          disabled={sending || !ready}
          aria-label="Comment text"
        />
        <button type="submit" disabled={sending || !text.trim() || !ready}>
          Post
        </button>
      </form>

      <div className={styles.list}>
        {parents.map((c) => (
          <CommentRow key={c.id} c={c} />
        ))}
      </div>

      {hasMoreParents && (
        <div className={styles.moreBar}>
          <button onClick={loadMoreParents} disabled={loadingParents}>
            {loadingParents ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {toast ? (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
