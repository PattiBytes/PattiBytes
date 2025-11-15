// app-next/lib/follow.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
  query as fsQuery,
  limit as fsLimit,
  getCountFromServer,
  runTransaction,
  type Transaction,
  type Firestore,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

type UserStats = {
  followersCount?: number;
  followingCount?: number;
};

export async function isFollowing(
  followerUid: string,
  targetUid: string,
): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !targetUid) return false;
  const ref = doc(db, 'users', followerUid, 'following', targetUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

// Small transaction retry helper
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

function safeStats(data: DocumentData | undefined): UserStats {
  const stats = (data?.stats as UserStats | undefined) ?? {};
  return {
    followersCount: Number(stats.followersCount ?? 0),
    followingCount: Number(stats.followingCount ?? 0),
  };
}

export async function followUser(
  followerUid: string,
  targetUid: string,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !targetUid || followerUid === targetUid) return;

  const followerRef = doc(db, 'users', followerUid, 'following', targetUid);
  const targetRef = doc(db, 'users', targetUid, 'followers', followerUid);
  const followerUserRef = doc(db, 'users', followerUid);
  const targetUserRef = doc(db, 'users', targetUid);

  await runWithRetry(db, async (tx) => {
    const [followDoc, followerUserDoc, targetUserDoc] = await Promise.all([
      tx.get(followerRef),
      tx.get(followerUserRef),
      tx.get(targetUserRef),
    ]);

    // Already following – do nothing
    if (followDoc.exists()) return;

    tx.set(
      followerRef,
      { uid: targetUid, createdAt: serverTimestamp() },
      { merge: true },
    );
    tx.set(
      targetRef,
      { uid: followerUid, createdAt: serverTimestamp() },
      { merge: true },
    );

    const followerStats = safeStats(followerUserDoc.data());
    const targetStats = safeStats(targetUserDoc.data());

    const currentFollowing = Math.max(
      0,
      followerStats.followingCount ?? 0,
    );
    const currentFollowers = Math.max(0, targetStats.followersCount ?? 0);

    tx.set(
      followerUserRef,
      {
        stats: { followingCount: currentFollowing + 1 },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      targetUserRef,
      {
        stats: { followersCount: currentFollowers + 1 },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function unfollowUser(
  followerUid: string,
  targetUid: string,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !targetUid || followerUid === targetUid) return;

  const followerRef = doc(db, 'users', followerUid, 'following', targetUid);
  const targetRef = doc(db, 'users', targetUid, 'followers', followerUid);
  const followerUserRef = doc(db, 'users', followerUid);
  const targetUserRef = doc(db, 'users', targetUid);

  await runWithRetry(db, async (tx) => {
    const [followDoc, followerUserDoc, targetUserDoc] = await Promise.all([
      tx.get(followerRef),
      tx.get(followerUserRef),
      tx.get(targetUserRef),
    ]);

    // Not following – nothing to decrement
    if (!followDoc.exists()) return;

    tx.delete(followerRef);
    tx.delete(targetRef);

    const followerStats = safeStats(followerUserDoc.data());
    const targetStats = safeStats(targetUserDoc.data());

    const currentFollowing = Math.max(
      0,
      followerStats.followingCount ?? 0,
    );
    const currentFollowers = Math.max(0, targetStats.followersCount ?? 0);

    tx.set(
      followerUserRef,
      {
        stats: {
          followingCount: Math.max(0, currentFollowing - 1),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      targetUserRef,
      {
        stats: {
          followersCount: Math.max(0, currentFollowers - 1),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function listFollowers(
  uid: string,
  max = 30,
): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) return [];
  const col = collection(db, 'users', uid, 'followers');
  const q = fsQuery(col, fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

export async function listFollowing(
  uid: string,
  max = 30,
): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) return [];
  const col = collection(db, 'users', uid, 'following');
  const q = fsQuery(col, fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

// Aggregate counts using count() API (source of truth)
export async function getFollowerCounts(
  uid: string,
): Promise<{ followers: number; following: number }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) return { followers: 0, following: 0 };

  const followersCol = collection(db, 'users', uid, 'followers');
  const followingCol = collection(db, 'users', uid, 'following');
  const [followersAgg, followingAgg] = await Promise.all([
    getCountFromServer(followersCol),
    getCountFromServer(followingCol),
  ]);
  return {
    followers: followersAgg.data().count,
    following: followingAgg.data().count,
  };
}
