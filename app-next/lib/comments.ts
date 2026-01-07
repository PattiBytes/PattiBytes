// app-next/lib/comments.ts
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  updateDoc,
  increment,
  runTransaction,
  getDoc,
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

type CommentDoc = {
  parentId?: string | null;
  repliesCount?: number;
  authorId?: string;
};

type PostStatsDoc = {
  commentsCount?: number;
  authorId?: string;
  title?: string;
};

function toSafeInt(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : Number(n ?? 0) || 0;
}

function buildPayload(args: {
  author: AuthorInfo;
  text: string;
  parentId: string | null;
  postId?: string;
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
 * Add top-level comment
 * - User posts: posts/{postId}/comments + increment posts/{postId}.commentsCount + notify post author.
 * - CMS posts: globalComments ONLY (no virtual post, no counter increment, no notification). [file:1]
 */
export async function addParentComment(postId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty comment', 'client/invalid-argument');

  if (isCMSPost(postId)) {
    // CMS: Use globalComments only
    const payload = buildPayload({ author, text: content, parentId: null, postId });
    await addDoc(collection(db, 'globalComments'), payload);
    return;
  }

  const postRef = doc(db, 'posts', postId);
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const payload = buildPayload({ author, text: content, parentId: null });

  // Create comment + increment counter
  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw codedError('Post not found', 'client/not-found');

    const newCommentRef = doc(commentsCol);
    tx.set(newCommentRef, payload);
    tx.update(postRef, { commentsCount: increment(1) });
  });

  // After successful write, notify post author (if not self)
  try {
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const postData = postSnap.data() as PostStatsDoc;
      const targetUserId = postData.authorId;
      if (targetUserId && targetUserId !== author.authorId && targetUserId !== 'system') {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          title: 'New comment on your post',
          body: `${author.authorName} commented: ${content.substring(0, 80)}…`,
          type: 'post-comment',
          icon: 'comment',
          postId,
          actorId: author.authorId,
          actorName: author.authorName,
          postTitle: postData.title ?? '',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Failed to send post comment notification:', err);
  }
}

/**
 * Add reply
 * - User posts: posts/{postId}/comments + increment parent.repliesCount
 *   + notify parent comment author + (optionally) post author.
 * - CMS posts: globalComments + increment parent.repliesCount (no notifications). [file:1]
 */
export async function addReply(
  postId: string,
  parentId: string,
  author: AuthorInfo,
  text: string,
) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty reply', 'client/invalid-argument');

  if (isCMSPost(postId)) {
    // CMS: Use globalComments
    const payload = buildPayload({ author, text: content, parentId, postId });
    await addDoc(collection(db, 'globalComments'), payload);

    // Update parent reply count
    const parentRef = doc(db, 'globalComments', parentId);
    await updateDoc(parentRef, { repliesCount: increment(1) });
    return;
  }

  const parentRef = doc(db, 'posts', postId, 'comments', parentId);
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const postRef = doc(db, 'posts', postId);
  const payload = buildPayload({ author, text: content, parentId });

  // Create reply + increment parent.repliesCount
  await runTransaction(db, async (tx) => {
    const parentSnap = await tx.get(parentRef);
    if (!parentSnap.exists()) throw codedError('Parent comment not found', 'client/not-found');

    const newReplyRef = doc(commentsCol);
    tx.set(newReplyRef, payload);
    tx.update(parentRef, { repliesCount: increment(1) });
  });

  // After successful write, notify parent comment author + post author
  try {
    const [parentSnap, postSnap] = await Promise.all([getDoc(parentRef), getDoc(postRef)]);
    const parentData = parentSnap.exists() ? (parentSnap.data() as CommentDoc) : {};
    const postData = postSnap.exists() ? (postSnap.data() as PostStatsDoc) : {};

    const parentAuthorId = parentData.authorId;
    const postAuthorId = postData.authorId;

    // Notify parent comment author (reply to their comment)
    if (parentAuthorId && parentAuthorId !== author.authorId) {
      await addDoc(collection(db, 'notifications'), {
        userId: parentAuthorId,
        title: 'New reply to your comment',
        body: `${author.authorName} replied: ${content.substring(0, 80)}…`,
        type: 'comment-reply',
        icon: 'comment',
        postId,
        parentCommentId: parentId,
        actorId: author.authorId,
        actorName: author.authorName,
        postTitle: postData.title ?? '',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    // Also notify post author if they are different from reply+parent author
    if (
      postAuthorId &&
      postAuthorId !== 'system' &&
      postAuthorId !== author.authorId &&
      postAuthorId !== parentAuthorId
    ) {
      await addDoc(collection(db, 'notifications'), {
        userId: postAuthorId,
        title: 'New comment on your post',
        body: `${author.authorName} replied on a comment under your post.`,
        type: 'post-comment',
        icon: 'comment',
        postId,
        parentCommentId: parentId,
        actorId: author.authorId,
        actorName: author.authorName,
        postTitle: postData.title ?? '',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Failed to send reply notifications:', err);
  }
}

/**
 * Delete comment
 * - User posts: Delete from posts/{postId}/comments + decrement counters
 * - CMS posts: Delete from globalComments + decrement counters
 * (no notification logic needed here). [file:1]
 */
export async function deleteCommentTx(postId: string, commentId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  if (isCMSPost(postId)) {
    // CMS: Delete from globalComments
    const commentRef = doc(db, 'globalComments', commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw codedError('Comment not found', 'client/not-found');

    const cData = commentSnap.data() as CommentDoc;
    const parentId = cData.parentId ?? null;

    await deleteDoc(commentRef);

    if (parentId) {
      try {
        const parentRef = doc(db, 'globalComments', parentId);
        const parentSnap = await getDoc(parentRef);
        if (parentSnap.exists()) {
          const pData = parentSnap.data() as CommentDoc;
          const current = toSafeInt(pData.repliesCount);
          await updateDoc(parentRef, { repliesCount: Math.max(0, current - 1) });
        }
      } catch (err) {
        console.warn('Failed to update parent replies count:', err);
      }
    }

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

  // User post: Delete from nested comments
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
