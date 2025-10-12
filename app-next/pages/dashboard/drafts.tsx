// app-next/pages/dashboard/drafts.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc as fsDoc,
  runTransaction,
  Timestamp,
  Query,
  DocumentData,
  getDocs,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTrash, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import styles from '@/styles/Drafts.module.css';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'react-hot-toast';

interface DraftListItem {
  id: string;
  title?: string;
  preview?: string;
  updatedAt?: Timestamp;
  expiresAt?: Timestamp;
}

function isExpired(ts?: Timestamp): boolean {
  if (!ts) return false;
  return ts.toMillis() <= Date.now();
}

export default function DraftsPage() {
  const { user } = useAuth();
  const { db } = getFirebaseClient();
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string; title: string } | null>(null);

  // Query with limit (required by Security Rules hasBoundedList())
  const listRef: Query<DocumentData> | null = useMemo(() => {
    if (!db || !user) return null;
    const col = collection(db, 'posts');
    return query(
      col,
      where('authorId', '==', user.uid),
      where('isDraft', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(50) // REQUIRED by Security Rules
    );
  }, [db, user]);

  useEffect(() => {
    if (!listRef) return;
    setLoading(true);
    const unsub = onSnapshot(
      listRef,
      (snap) => {
        const items: DraftListItem[] = snap.docs.map((d) => {
          const data = d.data() as {
            title?: string;
            preview?: string;
            updatedAt?: Timestamp;
            expiresAt?: Timestamp;
          };
          return {
            id: d.id,
            title: data.title,
            preview: data.preview,
            updatedAt: data.updatedAt,
            expiresAt: data.expiresAt,
          };
        });

        // Filter out expired drafts CLIENT-SIDE
        const activeDrafts = items.filter((it) => !isExpired(it.expiresAt));
        setDrafts(activeDrafts);
        setLoading(false);
      },
      (error) => {
        console.error('Drafts query error:', error);
        setLoading(false);
        toast.error('Failed to load drafts. Check your permissions.');
      }
    );
    return () => unsub();
  }, [listRef]);

  // Simplified cleanup: fetch user drafts and delete expired ones
  const cleanupExpired = useCallback(async () => {
    if (!db || !user || cleaningUp) return;
    setCleaningUp(true);

    try {
      // Query with limit (required by Security Rules)
      const q = query(
        collection(db, 'posts'),
        where('authorId', '==', user.uid),
        where('isDraft', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(50) // REQUIRED
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setCleaningUp(false);
        return;
      }

      const now = Date.now();
      const expiredDocs = snap.docs.filter((doc) => {
        const data = doc.data() as { expiresAt?: Timestamp };
        if (!data.expiresAt) return false;
        return data.expiresAt.toMillis() <= now;
      });

      if (expiredDocs.length === 0) {
        setCleaningUp(false);
        return;
      }

      // Delete in batch of 10 (free-tier safe)
      const batch = writeBatch(db);
      expiredDocs.slice(0, 10).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      console.log(`Cleaned up ${Math.min(expiredDocs.length, 10)} expired drafts`);
      
      if (expiredDocs.length > 0) {
        toast.success(`Cleaned up ${Math.min(expiredDocs.length, 10)} expired draft${expiredDocs.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      console.warn('Cleanup failed:', err);
      // Silent fail - not critical
    } finally {
      setCleaningUp(false);
    }
  }, [db, user, cleaningUp]);

  // Run cleanup once on mount (after delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      cleanupExpired();
    }, 2000); // 2 second delay
    return () => clearTimeout(timer);
  }, [cleanupExpired]);

  // Publish using transaction + optimistic UI
  const publish = async (id: string) => {
    if (!db || !user) return;

    const idx = drafts.findIndex((d) => d.id === id);
    let removed: DraftListItem | null = null;
    if (idx !== -1) {
      removed = drafts[idx];
      const next = drafts.slice();
      next.splice(idx, 1);
      setDrafts(next);
    }

    try {
      await runTransaction(db, async (tx) => {
        const ref = fsDoc(db, 'posts', id);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Draft not found');
        const data = snap.data() as { authorId?: string; isDraft?: boolean };
        if (data.authorId !== user.uid) throw new Error('Not authorized');
        if (data.isDraft !== true) return; // already published
        tx.update(ref, { isDraft: false, expiresAt: null });
      });
      toast.success('Draft published successfully!');
    } catch (err) {
      if (removed && idx !== -1) {
        setDrafts((prev) => [...prev.slice(0, idx), removed!, ...prev.slice(idx)]);
      }
      const msg = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(msg);
    }
  };

  // Open confirm modal for delete
  const confirmDelete = (id: string, title?: string) => {
    setConfirmData({ id, title: title || 'Untitled' });
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!db || !confirmData || !user) return;
    const { id } = confirmData;

    const idx = drafts.findIndex((d) => d.id === id);
    let removed: DraftListItem | null = null;
    if (idx !== -1) {
      removed = drafts[idx];
      const next = drafts.slice();
      next.splice(idx, 1);
      setDrafts(next);
    }

    try {
      await runTransaction(db, async (tx) => {
        const ref = fsDoc(db, 'posts', id);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Draft not found');
        const data = snap.data() as { authorId?: string; isDraft?: boolean };
        if (data.authorId !== user.uid) throw new Error('Not authorized');
        if (data.isDraft !== true) throw new Error('Not a draft');
        tx.delete(ref);
      });
      toast.success('Draft deleted permanently');
    } catch (err) {
      if (removed && idx !== -1) {
        setDrafts((prev) => [...prev.slice(0, idx), removed!, ...prev.slice(idx)]);
      }
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(msg);
    } finally {
      setConfirmOpen(false);
      setConfirmData(null);
    }
  };

  return (
    <AuthGuard>
      <Layout title="Drafts - PattiBytes">
        <div className={styles.page}>
          <div className={styles.header}>
            <div>
              <h1>My Drafts</h1>
              <p className={styles.subtitle}>Drafts expire after 24 hours</p>
            </div>
            <Link href="/create" className={styles.newBtn}>
              + Create New
            </Link>
          </div>

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading drafts...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📝</div>
              <h2>No active drafts</h2>
              <p className={styles.hint}>
                Drafts are automatically saved and retained for 24 hours.
              </p>
              <Link href="/create" className={styles.cta}>
                Start Writing
              </Link>
            </div>
          ) : (
            <>
              {cleaningUp && (
                <div className={styles.cleanupBanner}>
                  <FaSpinner className={styles.spinIcon} />
                  <span>Cleaning up expired drafts...</span>
                </div>
              )}
              <ul className={styles.list} aria-live="polite">
                <AnimatePresence initial={false}>
                  {drafts.map((d) => {
                    const timeLeft = d.expiresAt 
                      ? Math.max(0, d.expiresAt.toMillis() - Date.now())
                      : 0;
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                    return (
                      <motion.li
                        key={d.id}
                        className={styles.card}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className={styles.cardBody}>
                          <div className={styles.cardContent}>
                            <h3>{d.title || 'Untitled Draft'}</h3>
                            <p className={styles.preview}>{d.preview || 'No content yet...'}</p>
                            <div className={styles.metaRow}>
                              {d.updatedAt && (
                                <p className={styles.timestamp}>
                                  Updated {d.updatedAt.toDate().toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                  })}
                                </p>
                              )}
                              {timeLeft > 0 && (
                                <p className={styles.expiryBadge}>
                                  {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m left` : `${minutesLeft}m left`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={styles.cardActions}>
                            <Link href={`/create?edit=${d.id}`} className={styles.btnLight} aria-label="Edit draft">
                              <FaEdit /> Edit
                            </Link>
                            <button onClick={() => publish(d.id)} className={styles.btnPrimary} aria-label="Publish draft">
                              <FaPaperPlane /> Publish
                            </button>
                            <button
                              onClick={() => confirmDelete(d.id, d.title)}
                              className={styles.btnDanger}
                              aria-label="Delete draft"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </>
          )}
        </div>

        <ConfirmModal
          open={confirmOpen}
          title="Delete this draft permanently?"
          message={`This action cannot be undone. The draft "${confirmData?.title ?? 'Untitled'}" will be removed.`}
          confirmText="Delete permanently"
          cancelText="Keep draft"
          variant="danger"
          onConfirm={performDelete}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmData(null);
          }}
        />
      </Layout>
    </AuthGuard>
  );
}
