// lib/follow.ts
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDocs,
  limit,
  query as fsQuery,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseClient } from './firebase';
import { updateUserStats } from './username';

/**
 * Check if followerUid is following followedUid
 */
export async function isFollowing(followerUid: string, followedUid: string): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db || !followerUid || !followedUid) return false;
  // Following edge is stored under the follower's doc
  const ref = doc(db, 'users', followerUid, 'following', followedUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * Create follow edges and refresh counters safely.
 */
export async function followUser(followerUid: string, followedUid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !followedUid || followerUid === followedUid) return;

  const now = serverTimestamp();

  // Edges:
  // - users/{followedUid}/followers/{followerUid}
  // - users/{followerUid}/following/{followedUid}
  const followerRef = doc(db, 'users', followedUid, 'followers', followerUid);
  const followingRef = doc(db, 'users', followerUid, 'following', followedUid);

  await Promise.all([
    setDoc(followerRef, { uid: followerUid, createdAt: now }, { merge: true }),
    setDoc(followingRef, { uid: followedUid, createdAt: now }, { merge: true }),
  ]);

  // Recompose counters via helper (prevents undefined in nested stats)
  await Promise.all([
    updateUserStats(followedUid, { /* followersCount will be recomposed */ }),
    updateUserStats(followerUid, { /* followingCount will be recomposed */ }),
  ]);
}

/**
 * Remove follow edges and refresh counters safely.
 */
export async function unfollowUser(followerUid: string, followedUid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (!followerUid || !followedUid || followerUid === followedUid) return;

  const followerRef = doc(db, 'users', followedUid, 'followers', followerUid);
  const followingRef = doc(db, 'users', followerUid, 'following', followedUid);

  await Promise.all([deleteDoc(followerRef), deleteDoc(followingRef)]);

  await Promise.all([
    updateUserStats(followedUid, { /* followersCount recomposed */ }),
    updateUserStats(followerUid, { /* followingCount recomposed */ }),
  ]);
}

/**
 * List uids the user is following (most recent first)
 */
export async function listFollowing(uid: string, max = 20): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return [];
  // Prefer ordered list for consistent UX
  const q = fsQuery(collection(db, 'users', uid, 'following'), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => (d.data() as { uid?: string }).uid || d.id)
    .filter(Boolean);
}

/**
 * List followers uids (most recent first)
 */
export async function listFollowers(uid: string, max = 20): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return [];
  const q = fsQuery(collection(db, 'users', uid, 'followers'), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => (d.data() as { uid?: string }).uid || d.id)
    .filter(Boolean);
}
