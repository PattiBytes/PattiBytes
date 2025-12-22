// app-next/lib/follow.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
  query as fsQuery,
  limit as fsLimit,
  orderBy,
  getCountFromServer,
  runTransaction,
  type Transaction,
  type Firestore,
  type DocumentData,
  increment,
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
  throw lastError instanceof Error ? lastError : new Error('Transaction failed');
}

function safeStats(data: DocumentData | undefined): Required<UserStats> {
  const stats = (data?.stats as UserStats | undefined) ?? {};
  return {
    followersCount: Number(stats.followersCount ?? 0),
    followingCount: Number(stats.followingCount ?? 0),
  };
}

/**
 * Creates BOTH edges:
 * - users/{followerUid}/following/{targetUid}
 * - users/{targetUid}/followers/{followerUid}
 * And updates stats on both user docs.
 */
export async function followUser(
  followerUid: string,
  targetUid: string,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !targetUid || followerUid === targetUid) return;

  const followingRef = doc(db, 'users', followerUid, 'following', targetUid);
  const followerEdgeRef = doc(db, 'users', targetUid, 'followers', followerUid);

  const followerUserRef = doc(db, 'users', followerUid);
  const targetUserRef = doc(db, 'users', targetUid);

  await runWithRetry(db, async (tx) => {
    const [followingSnap, followerEdgeSnap, followerUserSnap, targetUserSnap] =
      await Promise.all([
        tx.get(followingRef),
        tx.get(followerEdgeRef),
        tx.get(followerUserRef),
        tx.get(targetUserRef),
      ]);

    // If both edges exist, already following
    if (followingSnap.exists() && followerEdgeSnap.exists()) return;

    // Ensure edges exist (repairs partial state too)
    tx.set(
      followingRef,
      { uid: targetUid, createdAt: serverTimestamp() },
      { merge: true },
    );
    tx.set(
      followerEdgeRef,
      { uid: followerUid, createdAt: serverTimestamp() },
      { merge: true },
    );

    // Only increment counts if we are transitioning from "not following" -> "following"
    // If one edge existed (partial), do NOT increment again.
    const shouldIncrement = !(followingSnap.exists() || followerEdgeSnap.exists());

    if (shouldIncrement) {
      const followerStats = safeStats(followerUserSnap.data());
      const targetStats = safeStats(targetUserSnap.data());

      tx.set(
        followerUserRef,
        {
          stats: { followingCount: Math.max(0, followerStats.followingCount + 1) },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        targetUserRef,
        {
          stats: { followersCount: Math.max(0, targetStats.followersCount + 1) },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      // Still touch updatedAt so UI reflects repair (optional)
      tx.set(followerUserRef, { updatedAt: serverTimestamp() }, { merge: true });
      tx.set(targetUserRef, { updatedAt: serverTimestamp() }, { merge: true });
    }
  });
}

/**
 * Deletes BOTH edges and decrements stats once.
 */
export async function unfollowUser(
  followerUid: string,
  targetUid: string,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !targetUid || followerUid === targetUid) return;

  const followingRef = doc(db, 'users', followerUid, 'following', targetUid);
  const followerEdgeRef = doc(db, 'users', targetUid, 'followers', followerUid);

  const followerUserRef = doc(db, 'users', followerUid);
  const targetUserRef = doc(db, 'users', targetUid);

  await runWithRetry(db, async (tx) => {
    const [followingSnap, followerEdgeSnap, followerUserSnap, targetUserSnap] =
      await Promise.all([
        tx.get(followingRef),
        tx.get(followerEdgeRef),
        tx.get(followerUserRef),
        tx.get(targetUserRef),
      ]);

    // If neither edge exists, nothing to do
    if (!followingSnap.exists() && !followerEdgeSnap.exists()) return;

    // Remove both (repairs partial state too)
    if (followingSnap.exists()) tx.delete(followingRef);
    if (followerEdgeSnap.exists()) tx.delete(followerEdgeRef);

    // Only decrement if we are transitioning from "following" -> "not following"
    // If one edge was missing already (partial), still decrement once because user was effectively following.
    const followerStats = safeStats(followerUserSnap.data());
    const targetStats = safeStats(targetUserSnap.data());

    tx.set(
      followerUserRef,
      {
        stats: { followingCount: Math.max(0, followerStats.followingCount - 1) },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(
      targetUserRef,
      {
        stats: { followersCount: Math.max(0, targetStats.followersCount - 1) },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function listFollowers(uid: string, max = 30): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) return [];

  const col = collection(db, 'users', uid, 'followers');
  const q = fsQuery(col, orderBy('createdAt', 'desc'), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

export async function listFollowing(uid: string, max = 30): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) return [];

  const col = collection(db, 'users', uid, 'following');
  const q = fsQuery(col, orderBy('createdAt', 'desc'), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

/**
 * Aggregate counts using count() API (source of truth).
 */
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

/**
 * Optional helper:
 * Fast “best-effort” counter bump using atomic increments (no reads).
 * Use this only if you ever move follow/unfollow to Cloud Functions / server,
 * or if you accept counters may drift and rely on getFollowerCounts() as truth.
 */
export async function bumpFollowCountersUnsafe(
  followerUid: string,
  targetUid: string,
  delta: 1 | -1,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !targetUid || followerUid === targetUid) return;

  await runWithRetry(db, async (tx) => {
    tx.set(
      doc(db, 'users', followerUid),
      { stats: { followingCount: increment(delta) }, updatedAt: serverTimestamp() },
      { merge: true },
    );
    tx.set(
      doc(db, 'users', targetUid),
      { stats: { followersCount: increment(delta) }, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
}
