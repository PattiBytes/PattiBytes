// app-next/lib/comments.ts
import {
  collection,
  doc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

type AuthorInfo = {
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
  authorPhoto?: string | null;
};

type CodedError = Error & { code?: string };

function codedError(message: string, code: string): CodedError {
  const e = new Error(message) as CodedError;
  e.code = code;
  return e;
}

function isCMSPost(postId: string): boolean {
  return postId.startsWith('cms-');
}

type PostStatsDoc = {
  commentsCount?: number;
};

type CommentDoc = {
  parentId?: string | null;
  repliesCount?: number;
};

function toSafeInt(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : Number(n ?? 0) || 0;
}

function buildPayload(args: {
  author: AuthorInfo;
  text: string;
  parentId: string | null;
  postId?: string; // only for CMS comments stored in globalComments
}): Record<string, unknown> {
  const { author, text, parentId, postId } = args;

  const payload: Record<string, unknown> = {
    authorId: author.authorId,
    authorName: author.authorName,
    text: text.trim(),
    parentId,
    createdAt: serverTimestamp(),
    likesCount: 0,
    repliesCount: 0,
  };

  if (author.authorUsername != null) payload.authorUsername = author.authorUsername;
  if (author.authorPhoto != null) payload.authorPhoto = author.authorPhoto;
  if (postId) payload.postId = postId;

  return payload;
}

/**
 * Add top-level comment:
 * - User posts: posts/{postId}/comments + posts/{postId}.commentsCount++
 * - CMS posts: globalComments + posts/{postId}.commentsCount++ (so dashboard can show counts)
 */
export async function addParentComment(postId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty comment', 'client/invalid-argument');

  if (isCMSPost(postId)) {
    const commentsCol = collection(db, 'globalComments');
    const newCommentRef = doc(commentsCol); // generate id now, write inside tx
    const postRef = doc(db, 'posts', postId);

    const payload = buildPayload({ author, text: content, parentId: null, postId });

    await runTransaction(db, async (tx) => {
      // Ensure the virtual CMS post doc exists and bump count
      tx.set(
        postRef,
        {
          isCMS: true,
          isOfficial: true,
          updatedAt: serverTimestamp(),
          commentsCount: increment(1),
        },
        { merge: true },
      );

      tx.set(newCommentRef, payload);
    });

    return;
  }

  // User post
  const postRef = doc(db, 'posts', postId);
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const payload = buildPayload({ author, text: content, parentId: null });

  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw codedError('Post not found', 'client/not-found');

    const newCommentRef = doc(commentsCol);
    tx.set(newCommentRef, payload);
    tx.update(postRef, { commentsCount: increment(1) });
  });
}

/**
 * Add reply:
 * Replies do NOT change posts/{postId}.commentsCount (UI uses top-level count only).
 */
export async function addReply(postId: string, parentId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty reply', 'client/invalid-argument');

  if (isCMSPost(postId)) {
    const commentsCol = collection(db, 'globalComments');
    const newReplyRef = doc(commentsCol);
    const parentRef = doc(db, 'globalComments', parentId);

    const payload = buildPayload({ author, text: content, parentId, postId });

    await runTransaction(db, async (tx) => {
      const parentSnap = await tx.get(parentRef);
      if (!parentSnap.exists()) throw codedError('Parent comment not found', 'client/not-found');

      tx.set(newReplyRef, payload);
      tx.update(parentRef, { repliesCount: increment(1) });
    });

    return;
  }

  // User post reply
  const parentRef = doc(db, 'posts', postId, 'comments', parentId);
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const payload = buildPayload({ author, text: content, parentId });

  await runTransaction(db, async (tx) => {
    const parentSnap = await tx.get(parentRef);
    if (!parentSnap.exists()) throw codedError('Parent comment not found', 'client/not-found');

    const newReplyRef = doc(commentsCol);
    tx.set(newReplyRef, payload);
    tx.update(parentRef, { repliesCount: increment(1) });
  });
}

export async function deleteCommentTx(postId: string, commentId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  if (isCMSPost(postId)) {
    const commentRef = doc(db, 'globalComments', commentId);
    const postRef = doc(db, 'posts', postId);

    await runTransaction(db, async (tx) => {
      const commentSnap = await tx.get(commentRef);
      if (!commentSnap.exists()) throw codedError('Comment not found', 'client/not-found');

      const cData = commentSnap.data() as CommentDoc;
      const parentId = cData.parentId ?? null;

      tx.delete(commentRef);

      if (parentId) {
        // reply => decrement parent repliesCount (clamped)
        const parentRef = doc(db, 'globalComments', parentId);
        const parentSnap = await tx.get(parentRef);

        if (parentSnap.exists()) {
          const pData = parentSnap.data() as CommentDoc;
          const current = toSafeInt(pData.repliesCount);
          tx.update(parentRef, { repliesCount: Math.max(0, current - 1) });
        }
      } else {
        // top-level => decrement posts/{postId}.commentsCount (clamped)
        const postSnap = await tx.get(postRef);
        const pData = (postSnap.exists() ? (postSnap.data() as PostStatsDoc) : {}) as PostStatsDoc;
        const current = toSafeInt(pData.commentsCount);

        tx.set(
          postRef,
          {
            isCMS: true,
            isOfficial: true,
            updatedAt: serverTimestamp(),
            commentsCount: Math.max(0, current - 1),
          },
          { merge: true },
        );
      }
    });

    // Cleanup likes (best-effort)
    try {
      const likesCol = collection(db, 'globalComments', commentId, 'likes');
      const likesSnap = await getDocs(likesCol);
      await Promise.allSettled(likesSnap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.warn('Failed to cleanup likes:', err);
    }

    return;
  }

  // User post: nested comments
  const cRef = doc(db, 'posts', postId, 'comments', commentId);
  const postRef = doc(db, 'posts', postId);

  await runTransaction(db, async (tx) => {
    const cSnap = await tx.get(cRef);
    if (!cSnap.exists()) return;

    const cData = cSnap.data() as CommentDoc;
    const parentId = cData.parentId ?? null;

    tx.delete(cRef);

    if (!parentId) {
      const postSnap = await tx.get(postRef);
      const pData = (postSnap.exists() ? (postSnap.data() as PostStatsDoc) : {}) as PostStatsDoc;
      const current = toSafeInt(pData.commentsCount);

      tx.update(postRef, { commentsCount: Math.max(0, current - 1) });
    } else {
      const parentRef = doc(db, 'posts', postId, 'comments', parentId);
      const parentSnap = await tx.get(parentRef);
      const pData = (parentSnap.exists() ? (parentSnap.data() as CommentDoc) : {}) as CommentDoc;
      const current = toSafeInt(pData.repliesCount);

      tx.update(parentRef, { repliesCount: Math.max(0, current - 1) });
    }
  });

  // Cleanup likes (best-effort)
  try {
    const likesCol = collection(db, 'posts', postId, 'comments', commentId, 'likes');
    const snap = await getDocs(likesCol);
    await Promise.allSettled(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('Failed to cleanup likes:', err);
  }
}
