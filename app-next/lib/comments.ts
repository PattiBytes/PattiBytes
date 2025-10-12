// app-next/lib/comments.ts
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  increment,
  getDocs,
  deleteDoc,
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

export async function addParentComment(postId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty comment', 'client/invalid-argument');

  const postRef = doc(db, 'posts', postId);
  const commentsCol = collection(db, 'posts', postId, 'comments');

  await runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw codedError('Post not found', 'client/not-found');

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

    const newRef = doc(commentsCol);
    // All reads are done; writes follow
    tx.set(newRef, payload);
    tx.update(postRef, { commentsCount: increment(1) });
  });
}

export async function addReply(postId: string, parentId: string, author: AuthorInfo, text: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const content = text.trim();
  if (!content) throw codedError('Empty reply', 'client/invalid-argument');

  const parentRef = doc(db, 'posts', postId, 'comments', parentId);
  const commentsCol = collection(db, 'posts', postId, 'comments');

  await runTransaction(db, async (tx) => {
    const parentSnap = await tx.get(parentRef);
    if (!parentSnap.exists()) throw codedError('Parent comment not found', 'client/not-found');

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

    // All reads are done; writes follow
    const newRef = doc(commentsCol);
    tx.set(newRef, payload);
    tx.update(parentRef, { repliesCount: increment(1) });
  });
}

export async function deleteCommentTx(postId: string, commentId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw codedError('Firestore not initialized', 'client/not-initialized');

  const cRef = doc(db, 'posts', postId, 'comments', commentId);
  const postRef = doc(db, 'posts', postId);

  await runTransaction(db, async (tx) => {
    // 1) Read the comment
    const cSnap = await tx.get(cRef);
    if (!cSnap.exists()) return;

    const data = cSnap.data() as { parentId?: string | null };
    const parentId = data?.parentId ?? null;

    // 2) Read whichever aggregate doc is needed (still before any write)
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

    // 3) All reads completed; perform writes
    tx.delete(cRef);

    if (!parentId) {
      tx.update(postRef, { commentsCount: Math.max(0, currentTopLevelCount - 1) });
    } else {
      const parentRef = doc(db, 'posts', postId, 'comments', parentId);
      tx.update(parentRef, { repliesCount: Math.max(0, currentRepliesCount - 1) });
    }
  });

  // Best-effort cleanup of per-user like docs (outside the transaction)
  try {
    const likesCol = collection(db, 'posts', postId, 'comments', commentId, 'likes');
    const snap = await getDocs(likesCol);
    await Promise.allSettled(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // ignore cleanup errors
  }
}
