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

export async function addParentComment(postId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty comment', 'client/invalid-argument');

  const payload: Record<string, unknown> = {
    authorId: author.authorId,
    authorName: author.authorName,
    text: content,
    parentId: null,
    createdAt: serverTimestamp(),
    likesCount: 0,
    repliesCount: 0,
  };
  if (author.authorUsername != null) payload.authorUsername = author.authorUsername;
  if (author.authorPhoto != null) payload.authorPhoto = author.authorPhoto;

  if (isCMSPost(postId)) {
    payload.postId = postId;
    await addDoc(collection(db, 'globalComments'), payload);
  } else {
    const postRef = doc(db, 'posts', postId);
    const commentsCol = collection(db, 'posts', postId, 'comments');
    await runTransaction(db, async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists()) throw codedError('Post not found', 'client/not-found');
      const newCommentRef = doc(commentsCol);
      tx.set(newCommentRef, payload);
      tx.update(postRef, { commentsCount: increment(1) });
    });
  }
}

export async function addReply(postId: string, parentId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty reply', 'client/invalid-argument');

  const payload: Record<string, unknown> = {
    authorId: author.authorId,
    authorName: author.authorName,
    text: content,
    parentId,
    createdAt: serverTimestamp(),
    likesCount: 0,
    repliesCount: 0,
  };
  if (author.authorUsername != null) payload.authorUsername = author.authorUsername;
  if (author.authorPhoto != null) payload.authorPhoto = author.authorPhoto;

  if (isCMSPost(postId)) {
    payload.postId = postId;
    await addDoc(collection(db, 'globalComments'), payload);
    const parentRef = doc(db, 'globalComments', parentId);
    await updateDoc(parentRef, { repliesCount: increment(1) });
  } else {
    const parentRef = doc(db, 'posts', postId, 'comments', parentId);
    const commentsCol = collection(db, 'posts', postId, 'comments');
    await runTransaction(db, async (tx) => {
      const parentSnap = await tx.get(parentRef);
      if (!parentSnap.exists()) throw codedError('Parent comment not found', 'client/not-found');
      const newReplyRef = doc(commentsCol);
      tx.set(newReplyRef, payload);
      tx.update(parentRef, { repliesCount: increment(1) });
    });
  }
}

export async function deleteCommentTx(postId: string, commentId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  if (isCMSPost(postId)) {
    // CMS: use globalComments
    const commentRef = doc(db, 'globalComments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw codedError('Comment not found', 'client/not-found');
    }

    const data = commentSnap.data() as { parentId?: string | null };
    const parentId = data?.parentId ?? null;

    // Delete the comment
    await deleteDoc(commentRef);
    
    // Update parent replies count if this is a reply
    if (parentId) {
      try {
        const parentRef = doc(db, 'globalComments', parentId);
        const parentSnap = await getDoc(parentRef);
        if (parentSnap.exists()) {
          const currentCount = (parentSnap.data().repliesCount as number) ?? 0;
          await updateDoc(parentRef, { repliesCount: Math.max(0, currentCount - 1) });
        }
      } catch (err) {
        console.warn('Failed to update parent replies count:', err);
      }
    }
    
    // Cleanup likes
    try {
      const likesCol = collection(db, 'globalComments', commentId, 'likes');
      const likesSnap = await getDocs(likesCol);
      await Promise.allSettled(likesSnap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.warn('Failed to cleanup likes:', err);
    }
  } else {
    // User post: use nested collection
    const cRef = doc(db, 'posts', postId, 'comments', commentId);
    const postRef = doc(db, 'posts', postId);

    await runTransaction(db, async (tx) => {
      const cSnap = await tx.get(cRef);
      if (!cSnap.exists()) return;

      const data = cSnap.data() as { parentId?: string | null };
      const parentId = data?.parentId ?? null;

      let currentTopLevelCount = 0;
      let currentRepliesCount = 0;

      if (!parentId) {
        const postSnap = await tx.get(postRef);
        if (postSnap.exists()) {
          currentTopLevelCount = (postSnap.data().commentsCount as number) ?? 0;
        }
      } else {
        const parentRef = doc(db, 'posts', postId, 'comments', parentId);
        const parentSnap = await tx.get(parentRef);
        if (parentSnap.exists()) {
          currentRepliesCount = (parentSnap.data().repliesCount as number) ?? 0;
        }
      }

      tx.delete(cRef);

      if (!parentId) {
        tx.update(postRef, { commentsCount: Math.max(0, currentTopLevelCount - 1) });
      } else {
        const parentRef = doc(db, 'posts', postId, 'comments', parentId);
        tx.update(parentRef, { repliesCount: Math.max(0, currentRepliesCount - 1) });
      }
    });

    try {
      const likesCol = collection(db, 'posts', postId, 'comments', commentId, 'likes');
      const snap = await getDocs(likesCol);
      await Promise.allSettled(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.warn('Failed to cleanup likes:', err);
    }
  }
}
