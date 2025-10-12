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
import { FaPaperPlane, FaSpinner } from 'react-icons/fa';

type Props = { postId: string; postTitle?: string; onCountChange?: (n: number) => void; pageSize?: number };

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
  postId?: string;
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

  const isCMS = useMemo(() => postId.startsWith('cms-'), [postId]);

  const baseRef = useMemo(() => {
    if (!db) return null;
    const id = typeof postId === 'string' ? postId.trim() : '';
    if (!id) return null;
    return isCMS ? collection(db, 'globalComments') : collection(db, 'posts', id, 'comments');
  }, [db, postId, isCMS]);

  const [parents, setParents] = useState<FsComment[]>([]);
  const [replies, setReplies] = useState<Record<string, FsComment[]>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editText, setEditText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const lastParentDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreParents, setHasMoreParents] = useState(true);
  const [loadingParents, setLoadingParents] = useState(false);
  const replyUnsubs = useRef<Record<string, () => void>>({});

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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

  useEffect(() => {
    if (!baseRef) return;
    setLoadingParents(true);

    const q = isCMS
      ? fsQuery(baseRef, where('postId', '==', postId), where('parentId', '==', null), orderBy('createdAt', 'asc'), limit(pageSize))
      : fsQuery(baseRef, where('parentId', '==', null), orderBy('createdAt', 'asc'), limit(pageSize));

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
      () => {
        showToast('Unable to load comments', 'error');
        setLoadingParents(false);
      }
    );
    return () => unsub();
  }, [baseRef, isCMS, postId, onCountChange, pageSize]);

  const loadMoreParents = async () => {
    if (!baseRef || !lastParentDoc.current || loadingParents || !hasMoreParents) return;
    setLoadingParents(true);
    try {
      const q = isCMS
        ? fsQuery(baseRef, where('postId', '==', postId), where('parentId', '==', null), orderBy('createdAt', 'asc'), startAfter(lastParentDoc.current), limit(pageSize))
        : fsQuery(baseRef, where('parentId', '==', null), orderBy('createdAt', 'asc'), startAfter(lastParentDoc.current), limit(pageSize));

      const snap = await getDocs(q);
      const more = snap.docs.map(mapSnapToComment);
      setParents((prev) => [...prev, ...more]);
      lastParentDoc.current = snap.docs[snap.docs.length - 1] || null;
      setHasMoreParents(snap.docs.length >= pageSize);
    } catch {
      showToast('Failed to load more', 'error');
    } finally {
      setLoadingParents(false);
    }
  };

  const ensureRepliesStream = (parentId: string) => {
    if (!baseRef || replyUnsubs.current[parentId]) return;

    const q = isCMS
      ? fsQuery(baseRef, where('postId', '==', postId), where('parentId', '==', parentId), orderBy('createdAt', 'asc'), limit(200))
      : fsQuery(baseRef, where('parentId', '==', parentId), orderBy('createdAt', 'asc'), limit(200));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(mapSnapToComment);
        setReplies((prev) => ({ ...prev, [parentId]: list }));
      },
      () => {}
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !text.trim() || !user || !userProfile) return;
    try {
      setSending(true);
      await addParentComment(
        postId,
        {
          authorId: user.uid,
          authorName: userProfile.displayName,
          authorUsername: userProfile.username ?? null,
          authorPhoto: userProfile.photoURL ?? null,
        },
        text
      );
      setText('');
      showToast('Comment posted! 🎉', 'success');
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
      setSendingReply((prev) => ({ ...prev, [parentId]: true }));
      await addReply(postId, parentId, {
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username ?? null,
        authorPhoto: userProfile.photoURL ?? null,
      }, value);
      setReplyText((prev) => ({ ...prev, [parentId]: '' }));
      if (!replyUnsubs.current[parentId]) ensureRepliesStream(parentId);
      showToast('Reply posted! 💬', 'success');
    } catch (err: unknown) {
      console.error('Post reply error:', err);
      const code = isFirebaseWriteError(err) ? err.code : undefined;
      showToast(code === 'permission-denied' ? 'Permission denied' : 'Failed to post reply', 'error');
    } finally {
      setSendingReply((prev) => ({ ...prev, [parentId]: false }));
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
      const commentRef = isCMS ? doc(db!, 'globalComments', c.id) : doc(baseRef, c.id);
      await updateDoc(commentRef, { text: val });
      setEditing((prev) => ({ ...prev, [c.id]: false }));
      showToast('Comment updated! ✏️', 'success');
    } catch (err: unknown) {
      console.error('Edit comment error:', err);
      const code = isFirebaseWriteError(err) ? err.code : undefined;
      showToast(code === 'permission-denied' ? 'Permission denied' : 'Failed to update comment', 'error');
    }
  };

  const removeComment = async (c: FsComment) => {
    if (!confirm('Delete this comment? This action cannot be undone.')) return;
    try {
      setDeleting((prev) => ({ ...prev, [c.id]: true }));
      await deleteCommentTx(postId, c.id);
      showToast('Comment deleted 🗑️', 'success');
    } catch (err) {
      console.error('Delete comment error:', err);
      const code = isFirebaseWriteError(err) ? err.code : undefined;
      if (code === 'client/not-found') {
        showToast('Comment already deleted', 'error');
      } else if (code === 'permission-denied') {
        showToast('Permission denied', 'error');
      } else {
        showToast('Failed to delete comment', 'error');
      }
      setDeleting((prev) => ({ ...prev, [c.id]: false }));
    }
  };

  const canModify = (c: FsComment) => user?.uid === c.authorId || isAdmin;

  const CommentRow = ({ c }: { c: FsComment }) => {
    const profileHref = c.authorUsername ? `/user/${c.authorUsername}` : `/search?u=${encodeURIComponent(c.authorName)}`;
    const isEditing = editing[c.id];
    const isParent = !c.parentId;
    const isDeleting = deleting[c.id];

    if (isDeleting) {
      return (
        <div className={styles.itemDeleting}>
          <FaSpinner className={styles.spinIcon} />
          <span>Deleting...</span>
        </div>
      );
    }

    return (
      <div className={styles.item}>
        <Link href={profileHref} className={styles.avatarLink}>
          <SafeImage
            src={c.authorPhoto || '/images/default-avatar.png'}
            alt={c.authorName}
            width={40}
            height={40}
            className={styles.avatar}
          />
        </Link>
        <div className={styles.bubble}>
          <div className={styles.meta}>
            <Link href={profileHref} className={styles.authorLink}>
              <strong>{c.authorName}</strong>
            </Link>
            <span className={styles.timestamp}>{c.createdAt.toLocaleString()}</span>
          </div>

          {isEditing ? (
            <div className={styles.editRow}>
              <textarea
                value={editText[c.id] || ''}
                onChange={(e) => setEditText((p) => ({ ...p, [c.id]: e.target.value }))}
                aria-label="Edit comment"
                rows={3}
                className={styles.editTextarea}
              />
              <div className={styles.editActions}>
                <button onClick={() => saveEdit(c)} className={styles.btnSave}>
                  Save
                </button>
                <button onClick={() => setEditing((p) => ({ ...p, [c.id]: false }))} className={styles.btnCancel}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.text}>{c.text}</p>
          )}

          <div className={styles.actionsSmall}>
            <CommentLikeButton postId={postId} commentId={c.id} className={styles.actionSm} isCMS={isCMS} />
            {isParent ? (
              <button
                className={styles.actionSm}
                onClick={() => {
                  setReplyOpen((p) => ({ ...p, [c.id]: !p[c.id] }));
                  if (!replies[c.id]) ensureRepliesStream(c.id);
                }}
                aria-expanded={!!replyOpen[c.id]}
              >
                💬 Reply ({c.repliesCount || 0})
              </button>
            ) : null}
            {canModify(c) ? (
              <>
                <button className={styles.actionSm} onClick={() => startEdit(c)}>
                  ✏️ Edit
                </button>
                <button className={styles.actionSmDanger} onClick={() => removeComment(c)}>
                  🗑️ Delete
                </button>
              </>
            ) : null}
          </div>

          {isParent && replyOpen[c.id] && (
            <div className={styles.replyRow}>
              <SafeImage
                src={userProfile?.photoURL || '/images/default-avatar.png'}
                alt="You"
                width={32}
                height={32}
                className={styles.avatarSmall}
              />
              <input
                placeholder="Write a reply..."
                value={replyText[c.id] || ''}
                onChange={(e) => setReplyText((p) => ({ ...p, [c.id]: e.target.value }))}
                aria-label="Reply text"
                className={styles.replyInput}
              />
              <button
                onClick={() => sendReply(c.id)}
                disabled={!replyText[c.id]?.trim() || sendingReply[c.id]}
                className={styles.btnReply}
              >
                {sendingReply[c.id] ? <FaSpinner className={styles.spinIcon} /> : <FaPaperPlane />}
              </button>
            </div>
          )}

          <div className={styles.replies}>
            {(replies[c.id] || []).map((r) => (
              <CommentRow key={r.id} c={r} />
            ))}
            {!replies[c.id] && (c.repliesCount || 0) > 0 && (
              <button className={styles.loadReplies} onClick={() => ensureRepliesStream(c.id)}>
                View {c.repliesCount} {c.repliesCount === 1 ? 'reply' : 'replies'} →
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

      {!user && (
        <div className={styles.loginPrompt}>
          <p>Please log in to leave a comment</p>
        </div>
      )}

      {user && (
        <form onSubmit={send} className={styles.inputRow}>
          <SafeImage
            src={userProfile?.photoURL || '/images/default-avatar.png'}
            alt="You"
            width={44}
            height={44}
            className={styles.avatar}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={!ready ? 'Preparing…' : 'Share your thoughts...'}
            disabled={sending || !ready}
            aria-label="Comment text"
            className={styles.mainInput}
          />
          <button type="submit" disabled={sending || !text.trim() || !ready} className={styles.btnPost}>
            {sending ? <FaSpinner className={styles.spinIcon} /> : <FaPaperPlane />}
            <span>Post</span>
          </button>
        </form>
      )}

      {loadingParents && parents.length === 0 ? (
        <div className={styles.loadingState}>
          <FaSpinner className={styles.spinIcon} />
          <p>Loading comments...</p>
        </div>
      ) : parents.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💬</span>
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {parents.map((c) => (
            <CommentRow key={c.id} c={c} />
          ))}
        </div>
      )}

      {hasMoreParents && (
        <div className={styles.moreBar}>
          <button onClick={loadMoreParents} disabled={loadingParents} className={styles.btnLoadMore}>
            {loadingParents ? (
              <>
                <FaSpinner className={styles.spinIcon} /> Loading...
              </>
            ) : (
              'Load more comments'
            )}
          </button>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
