// app-next/lib/unread.ts
import { useEffect, useState } from 'react';
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

type Counts = { notifications: number; messages: number };

export function subscribeUnreadCounts(
  uid: string,
  db: Firestore,
  onChange: (counts: Counts) => void
) {
  // Notifications (top-level) where userId==uid and isRead==false
  const notifQ = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('isRead', '==', false)
  );

  // Messages (collectionGroup) where to==uid and read==false (cap to 10 for cheap badge)
  const msgQ = query(
    collectionGroup(db, 'messages'),
    where('to', '==', uid),
    where('read', '==', false),
    limit(10)
  );

  let counts: Counts = { notifications: 0, messages: 0 };

  const nUnsub = onSnapshot(
    notifQ,
    (snap) => {
      counts = { ...counts, notifications: snap.size };
      onChange(counts);
    },
    () => {
      counts = { ...counts, notifications: 0 };
      onChange(counts);
    }
  );

  const mUnsub = onSnapshot(
    msgQ,
    (snap) => {
      // Show up to 9+, not exact total for scale/cost
      counts = { ...counts, messages: snap.size };
      onChange(counts);
    },
    () => {
      counts = { ...counts, messages: 0 };
      onChange(counts);
    }
  );

  return () => {
    nUnsub();
    mUnsub();
  };
}

export function useUnreadCounts(uid: string | null) {
  const { db } = getFirebaseClient();
  const [state, setState] = useState<Counts>({ notifications: 0, messages: 0 });

  useEffect(() => {
    if (!db || !uid) return;
    return subscribeUnreadCounts(uid, db, setState);
  }, [db, uid]);

  return state;
}
