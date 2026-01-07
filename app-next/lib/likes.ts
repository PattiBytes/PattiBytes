// app-next/lib/likes.ts
import {
  doc,
  runTransaction,
  serverTimestamp,
  increment,
  getDoc,
  collection,
  type Firestore,
  type Transaction,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

// Helper: generic transaction retry
async function runWithRetry<T>(
  db: Firestore,
  fn: (tx: Transaction) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await runTransaction(db, fn);
    } catch (err) {
      lastError = err;

      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('failed-precondition') ||
        msg.includes('ABORTED') ||
        msg.includes('10 ')
      ) {
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Transaction failed');
}

// Ensure CMS post exists before liking
async function ensureCMSPost(db: Firestore, postId: string) {
  if (!postId.startsWith('cms-')) return; // Only for CMS posts

  const postRef = doc(db, 'posts', postId);
  const existing = await getDoc(postRef);
  if (existing.exists()) return;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (snap.exists()) return;

    tx.set(postRef, {
      authorId: 'system',
      authorName: 'PattiBytes',
      title: 'CMS Content',
      content: '',
      createdAt: serverTimestamp(),
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      isOfficial: true,
      isCMS: true,
    });
  });
}

// Small helper for notifications
function createNotificationRef(db: Firestore) {
  return doc(collection(db, 'notifications'));
}

/**
 * Toggle like on a post.
 * - Works for normal posts and CMS posts (CMS via virtual posts). [file:1]
 * - On first-time like, notifies post author (except self-like, or system author).
 */
export async function togglePostLike(
  postId: string,
  uid: string,
  wantLike: boolean,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  // Ensure CMS posts have a virtual post doc
  await ensureCMSPost(db, postId);

  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', uid);

  await runWithRetry(db, async (tx) => {
    const [postSnap, likeSnap] = await Promise.all([
      tx.get(postRef),
      tx.get(likeRef),
    ]);

    if (!postSnap.exists()) throw new Error('Post missing');

    const postData = postSnap.data() as {
      authorId?: string;
      title?: string;
    };

    if (wantLike) {
      if (likeSnap.exists()) return;

      // Create notification for post author (if not self & not system)
      const targetUserId = postData.authorId;
      if (targetUserId && targetUserId !== uid && targetUserId !== 'system') {
        const notifRef = createNotificationRef(db);
        tx.set(notifRef, {
          userId: targetUserId,
          title: 'New like on your post',
          body: 'Someone liked your post.', // keep generic to avoid extra reads
          type: 'post-like',
          icon: 'heart',
          postId,
          actorId: uid,
          postTitle: postData.title ?? '',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      tx.set(likeRef, { uid, createdAt: serverTimestamp() });
      tx.update(postRef, { likesCount: increment(1) });
    } else {
      if (!likeSnap.exists()) return;

      tx.delete(likeRef);
      tx.update(postRef, { likesCount: increment(-1) });
      // No notification on unlike
    }
  });
}

/**
 * Toggle like on a comment.
 * - Only for user posts (comments are under posts/{postId}/comments). [file:1]
 * - On first-time like, notifies comment author (except self-like).
 */
export async function toggleCommentLike(
  postId: string,
  commentId: string,
  uid: string,
  wantLike: boolean,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const cRef = doc(db, 'posts', postId, 'comments', commentId);
  const likeRef = doc(db, 'posts', postId, 'comments', commentId, 'likes', uid);

  await runWithRetry(db, async (tx) => {
    const [cSnap, likeSnap] = await Promise.all([
      tx.get(cRef),
      tx.get(likeRef),
    ]);

    if (!cSnap.exists()) throw new Error('Comment missing');

    const cData = cSnap.data() as { authorId?: string };

    if (wantLike) {
      if (likeSnap.exists()) return;

      // Notify comment author when someone likes their comment
      const targetUserId = cData.authorId;
      if (targetUserId && targetUserId !== uid) {
        const notifRef = createNotificationRef(db);
        tx.set(notifRef, {
          userId: targetUserId,
          title: 'New like on your comment',
          body: 'Someone liked your comment.',
          type: 'comment-like',
          icon: 'heart',
          postId,
          commentId,
          actorId: uid,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }

      tx.set(likeRef, { uid, createdAt: serverTimestamp() });
      tx.update(cRef, { likesCount: increment(1) });
    } else {
      if (!likeSnap.exists()) return;

      tx.delete(likeRef);
      tx.update(cRef, { likesCount: increment(-1) });
    }
  });
}
