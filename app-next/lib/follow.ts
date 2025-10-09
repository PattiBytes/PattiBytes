// lib/follow.ts
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, limit, query as fsQuery, orderBy } from 'firebase/firestore';
import { getFirebaseClient } from './firebase';
import { updateUserStats } from './username';

export async function isFollowing(currentUid: string, targetUid: string): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db || !currentUid || !targetUid) return false;
  const ref = doc(db, 'users', currentUid, 'following', targetUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function followUser(currentUid: string, targetUid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db || !currentUid || !targetUid || currentUid === targetUid) return;

  const now = serverTimestamp();
  const followingRef = doc(db, 'users', currentUid, 'following', targetUid);
  const followersRef = doc(db, 'users', targetUid, 'followers', currentUid);

  await setDoc(followingRef, { uid: targetUid, createdAt: now }, { merge: true });
  await setDoc(followersRef, { uid: currentUid, createdAt: now }, { merge: true });

  // Update stats
  await Promise.all([
    updateUserStats(currentUid, { followingCount: (undefined as unknown as number) }), // placeholder to trigger merge
    updateUserStats(targetUid, { followersCount: (undefined as unknown as number) })
  ]);
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db || !currentUid || !targetUid || currentUid === targetUid) return;

  const followingRef = doc(db, 'users', currentUid, 'following', targetUid);
  const followersRef = doc(db, 'users', targetUid, 'followers', currentUid);

  await Promise.all([deleteDoc(followingRef), deleteDoc(followersRef)]);

  await Promise.all([
    updateUserStats(currentUid, { followingCount: (undefined as unknown as number) }),
    updateUserStats(targetUid, { followersCount: (undefined as unknown as number) })
  ]);
}

export async function listFollowing(uid: string, max = 20): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return [];
  const q = fsQuery(collection(db, 'users', uid, 'following'), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => (d.data().uid as string)).filter(Boolean);
}

export async function listFollowers(uid: string, max = 20): Promise<string[]> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return [];
  const q = fsQuery(collection(db, 'users', uid, 'followers'), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => (d.data().uid as string)).filter(Boolean);
}
