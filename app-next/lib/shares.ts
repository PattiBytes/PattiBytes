// app-next/lib/shares.ts
import { doc, runTransaction } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

export async function incrementShare(postId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const postRef = doc(db, 'posts', postId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post missing');
    const current = (snap.data().sharesCount as number) ?? 0;
    tx.update(postRef, { sharesCount: current + 1 });
  });
}
