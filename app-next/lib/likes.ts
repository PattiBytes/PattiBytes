// app-next/lib/likes.ts
import { doc, runTransaction, serverTimestamp, increment, getDoc, type Firestore } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

// Helper to ensure CMS post exists before liking
async function ensureCMSPost(db: Firestore, postId: string) {
  if (!postId.startsWith('cms-')) return; // Only for CMS posts
  
  const postRef = doc(db, 'posts', postId);
  const existing = await getDoc(postRef);
  if (existing.exists()) return;

  // Create minimal virtual post
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

export async function togglePostLike(postId: string, uid: string, wantLike: boolean) {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  // Ensure CMS post exists
  await ensureCMSPost(db, postId);

  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', uid);

  await runTransaction(db, async (tx) => {
    const [postSnap, likeSnap] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
    if (!postSnap.exists()) throw new Error('Post missing');

    if (wantLike) {
      if (likeSnap.exists()) return;
      tx.set(likeRef, { uid, createdAt: serverTimestamp() });
      tx.update(postRef, { likesCount: increment(1) });
    } else {
      if (!likeSnap.exists()) return;
      tx.delete(likeRef);
      const current = (postSnap.data().likesCount as number) ?? 0;
      tx.update(postRef, { likesCount: Math.max(0, current - 1) });
    }
  });
}

export async function toggleCommentLike(postId: string, commentId: string, uid: string, wantLike: boolean) {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const cRef = doc(db, 'posts', postId, 'comments', commentId);
  const likeRef = doc(db, 'posts', postId, 'comments', commentId, 'likes', uid);

  await runTransaction(db, async (tx) => {
    const [cSnap, likeSnap] = await Promise.all([tx.get(cRef), tx.get(likeRef)]);
    if (!cSnap.exists()) throw new Error('Comment missing');

    if (wantLike) {
      if (likeSnap.exists()) return;
      tx.set(likeRef, { uid, createdAt: serverTimestamp() });
      tx.update(cRef, { likesCount: increment(1) });
    } else {
      if (!likeSnap.exists()) return;
      tx.delete(likeRef);
      const current = (cSnap.data().likesCount as number) ?? 0;
      tx.update(cRef, { likesCount: Math.max(0, current - 1) });
    }
  });
}
