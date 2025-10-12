// app-next/lib/analytics.ts
import { doc, runTransaction } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

// Increment views once per session per post
export async function incrementViewOnce(postId: string) {
  if (typeof window === 'undefined') return;
  const key = `viewed-post-${postId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const { db } = getFirebaseClient();
  if (!db) return;
  const postRef = doc(db, 'posts', postId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) return;
    const current = (snap.data().viewsCount as number) ?? 0;
    tx.update(postRef, { viewsCount: current + 1 });
  });
}
