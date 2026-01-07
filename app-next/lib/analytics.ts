// app-next/lib/analytics.ts
import {
  doc,
  runTransaction,
  increment,
  type Firestore,
  type Transaction,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

// Small helper to retry the transaction a couple of times if it fails transiently
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
  throw lastError instanceof Error
    ? lastError
    : new Error('Transaction failed');
}

function isCMSPost(postId: string): boolean {
  return postId.startsWith('cms-');
}

// Increment views once per session per post (user posts only)
export async function incrementViewOnce(postId: string) {
  if (typeof window === 'undefined') return;

  // Do not track views for CMS posts here (no virtual posts)
  if (isCMSPost(postId)) return;

  const key = `viewed-post-${postId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const { db } = getFirebaseClient();
  if (!db) return;

  const postRef = doc(db, 'posts', postId);

  await runWithRetry(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) return;
    // Atomic increment; no manual read/modify/write
    tx.update(postRef, { viewsCount: increment(1) });
  });
}
