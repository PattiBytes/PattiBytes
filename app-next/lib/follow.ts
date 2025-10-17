// app-next/lib/follow.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  collection,
  getDocs,
  query as fsQuery,
  limit as fsLimit,
  increment,
  getCountFromServer,
} from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

export async function isFollowing(followerUid: string, targetUid: string): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, 'users', followerUid, 'following', targetUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function followUser(followerUid: string, targetUid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (followerUid === targetUid) return;

  const batch = writeBatch(db);
  const followerRef = doc(db, 'users', followerUid, 'following', targetUid);
  const targetRef = doc(db, 'users', targetUid, 'followers', followerUid);

  batch.set(followerRef, { uid: targetUid, createdAt: serverTimestamp() }, { merge: true });
  batch.set(targetRef, { uid: followerUid, createdAt: serverTimestamp() }, { merge: true });

  batch.set(
    doc(db, 'users', followerUid),
    { stats: { followingCount: increment(1) }, updatedAt: serverTimestamp() },
    { merge: true }
  );
  batch.set(
    doc(db, 'users', targetUid),
    { stats: { followersCount: increment(1) }, updatedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();
}

export async function unfollowUser(followerUid: string, targetUid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (followerUid === targetUid) return;

  const batch = writeBatch(db);
  const followerRef = doc(db, 'users', followerUid, 'following', targetUid);
  const targetRef = doc(db, 'users', targetUid, 'followers', followerUid);

  batch.delete(followerRef);
  batch.delete(targetRef);

  batch.set(
    doc(db, 'users', followerUid),
    { stats: { followingCount: increment(-1) }, updatedAt: serverTimestamp() },
    { merge: true }
  );
  batch.set(
    doc(db, 'users', targetUid),
    { stats: { followersCount: increment(-1) }, updatedAt: serverTimestamp() },
    { merge: true }
  );

  await batch.commit();
}

export async function listFollowers(uid: string, max = 30): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const col = collection(db, 'users', uid, 'followers');
  const q = fsQuery(col, fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

export async function listFollowing(uid: string, max = 30): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const col = collection(db, 'users', uid, 'following');
  const q = fsQuery(col, fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

// Aggregate counts using count() API (fast, no document reads)
export async function getFollowerCounts(uid: string): Promise<{ followers: number; following: number }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const followersCol = collection(db, 'users', uid, 'followers');
  const followingCol = collection(db, 'users', uid, 'following');
  const [followersAgg, followingAgg] = await Promise.all([getCountFromServer(followersCol), getCountFromServer(followingCol)]);
  return { followers: followersAgg.data().count, following: followingAgg.data().count };
}
