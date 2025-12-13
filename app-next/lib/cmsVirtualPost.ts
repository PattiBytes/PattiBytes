// app-next/lib/cmsVirtualPost.ts
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

type EnsureCmsPostArgs = {
  db: Firestore;
  postId: string; // e.g. cms-news-kulla-road
  title?: string;
  type?: 'cms-news' | 'cms-place';
};

export async function ensureCmsVirtualPost({
  db,
  postId,
  title,
  type,
}: EnsureCmsPostArgs): Promise<void> {
  if (!db) return;
  if (!postId || !postId.startsWith('cms-')) return;

  const ref = doc(db, 'posts', postId);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  // Must be a real Timestamp (serverTimestamp() is a sentinel and fails rules)
  const now = Timestamp.fromDate(new Date());

  await setDoc(ref, {
    // option B flags
    isCMS: true,
    isOfficial: true,
    authorId: 'system',

    // helpful metadata
    title: title ?? '',
    type: type ?? 'cms-news',

    // counters (rules expect 0)
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,

    createdAt: now,
    updatedAt: now,
  });
}
