// app-next/lib/shares.ts
import { doc, runTransaction, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

function isCMSPost(postId: string): boolean {
  return postId.startsWith('cms-');
}

export async function incrementShare(postId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  if (isCMSPost(postId)) {
    // CMS posts: track in separate collection
    const shareRef = doc(db, 'cmsShares', postId);
    
    try {
      const shareDoc = await getDoc(shareRef);
      if (shareDoc.exists()) {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(shareRef);
          const current = (snap.data()?.count as number) ?? 0;
          tx.update(shareRef, { count: current + 1, lastShared: serverTimestamp() });
        });
      } else {
        await setDoc(shareRef, { 
          postId, 
          count: 1, 
          createdAt: serverTimestamp(),
          lastShared: serverTimestamp() 
        });
      }
    } catch (err) {
      console.warn('Failed to track CMS share:', err);
    }
  } else {
    // Regular user posts: update shares count
    const postRef = doc(db, 'posts', postId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists()) throw new Error('Post missing');
      tx.update(postRef, { sharesCount: increment(1) });
    });
  }
}
