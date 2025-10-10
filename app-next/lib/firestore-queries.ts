// lib/firestore-queries.ts
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

export interface UserDoc {
  displayName?: string;
  username?: string;
  photoURL?: string | null;
  [k: string]: unknown;
}

export interface PostDoc {
  authorId: string;
  title?: string;
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  createdAt?: Timestamp | Date;
  [k: string]: unknown;
}

export interface ByteDoc {
  userId: string;
  userName?: string;
  userPhoto?: string | null;
  imageUrl: string;
  createdAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  [k: string]: unknown;
}

export async function getUserProfileDoc(uid: string): Promise<UserDoc | null> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function getUserByUsername(username: string): Promise<(UserDoc & { uid: string }) | null> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const uname = String(username).trim().toLowerCase();
  const mapSnap = await getDoc(doc(db, 'usernames', uname));
  if (!mapSnap.exists()) return null;
  const { uid } = mapSnap.data() as { uid: string };
  const userSnap = await getDoc(doc(db, 'users', uid));
  return userSnap.exists() ? ({ uid, ...(userSnap.data() as UserDoc) }) : null;
}

export async function fetchPostsByAuthor(
  uid: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & PostDoc> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const base = query(
    collection(db, 'posts'),
    where('authorId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as PostDoc) })),
  };
}

export async function fetchRecentPosts(
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & PostDoc> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const base = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize));
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as PostDoc) })),
  };
}

export async function fetchPostComments(
  postId: string,
  pageSize = 100,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & DocumentData> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const base = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'), limit(pageSize));
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })),
  };
}

export async function fetchPostLikes(
  postId: string,
  pageSize = 200,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & DocumentData> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const base = query(collection(db, 'posts', postId, 'likes'), orderBy('createdAt', 'desc'), limit(pageSize));
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })),
  };
}

export async function fetchBytesByUser(
  uid: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & ByteDoc> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  // If rules filter by expiresAt, also include that filter here to match rules:
  // where('expiresAt','>', Timestamp.now()), orderBy('expiresAt','desc')
  const base = query(
    collection(db, 'bytes'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as ByteDoc) })),
  };
}

export async function fetchStoriesByUser(
  uid: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & DocumentData> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const base = query(
    collection(db, 'stories'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })),
  };
}

export async function fetchChatMessages(
  chatId: string,
  pageSize = 200,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: QueryDocumentSnapshot<DocumentData>[]; data: Array<{ id: string } & DocumentData> }> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const base = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(pageSize));
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  return {
    docs: snap.docs,
    data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })),
  };
}
