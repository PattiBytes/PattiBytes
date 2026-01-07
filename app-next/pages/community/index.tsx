// app-next/pages/community/index.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  doc,
  getDoc,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import {
  FaPlus,
  FaUsers,
  FaSearch,
  FaComments,
  FaBullhorn,
  FaCheckCircle,
  FaClock,
  FaCircle,
} from 'react-icons/fa';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/styles/Community.module.css';

type ChatType = 'private' | 'group' | 'official';

interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  photoURL?: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  otherUserId?: string;
  otherUserName?: string;
  otherUserPhoto?: string;
  isTyping?: boolean;
  isOnline?: boolean;
  isOfficial?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Community() {
  const { user, isAdmin } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'private' | 'groups'>('all');
  const { db } = getFirebaseClient();

  // Load chats
  useEffect(() => {
    if (!user?.uid || !db) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const list: Chat[] = [];

        for (const d of snapshot.docs) {
          const c = d.data() as DocumentData;
          const type: ChatType = c.type || 'private';

          if (type === 'private') {
            const otherId = (c.participants as string[]).find((id) => id !== user.uid);
            if (!otherId) continue;

            const otherSnap = await getDoc(doc(db, 'users', otherId));
            const other = otherSnap.exists() ? otherSnap.data() : null;

            list.push({
              id: d.id,
              type,
              participants: c.participants,
              lastMessage: c.lastMessage || '',
              lastMessageTime:
                c.lastMessageTime && typeof c.lastMessageTime.toDate === 'function'
                  ? (c.lastMessageTime as Timestamp).toDate()
                  : new Date(0),
              unreadCount: c[`unread_${user.uid}`] || 0,
              otherUserId: otherId,
              otherUserName: other?.displayName || 'User',
              otherUserPhoto: other?.photoURL || '/images/default-avatar.png',
              isTyping: c[`typing_${otherId}`] || false,
              isOnline: other?.onlineStatus === 'online' || false,
            });
          } else {
            list.push({
              id: d.id,
              type,
              name: c.name || 'Group Chat',
              photoURL: c.photoURL,
              participants: c.participants,
              lastMessage: c.lastMessage || '',
              lastMessageTime:
                c.lastMessageTime && typeof c.lastMessageTime.toDate === 'function'
                  ? (c.lastMessageTime as Timestamp).toDate()
                  : new Date(0),
              unreadCount: c[`unread_${user.uid}`] || 0,
              isOfficial: c.isOfficial || false,
            });
          }
        }

        setChats(
          list.sort((a, b) => (b.lastMessageTime?.getTime?.() || 0) - (a.lastMessageTime?.getTime?.() || 0))
        );
        setLoading(false);
      },
      (err) => {
        console.warn('Community snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, db]);

  const filtered = useMemo(() => {
    let result = chats;

    if (tab === 'private') result = chats.filter((c) => c.type === 'private');
    if (tab === 'groups') result = chats.filter((c) => c.type !== 'private');

    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;

    return result.filter((c) =>
      (c.type === 'private' ? c.otherUserName : c.name)?.toLowerCase().includes(q)
    );
  }, [chats, tab, searchQuery]);

  const formatTime = (date?: Date) => {
    if (!date) return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  return (
    <AuthGuard>
      <Layout title="Community - PattiBytes">
        <div className={styles.community}>
          {/* Header */}
          <motion.header
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.headerTop}>
              <div className={styles.titleGroup}>
                <div className={styles.iconWrap}>
                  <FaComments />
                </div>
                <div>
                  <h1>Community</h1>
                  <p className={styles.subtitle}>Connect with people around you</p>
                </div>
              </div>
              <Link href="/community/new" className={styles.newChatBtn} title="New Chat">
                <FaPlus />
                <span>New</span>
              </Link>
            </div>

            <div className={styles.tabs}>
              <button
                onClick={() => setTab('all')}
                className={`${styles.tab} ${tab === 'all' ? styles.active : ''}`}
              >
                <FaComments />
                <span>All</span>
                {chats.length > 0 && <span className={styles.count}>{chats.length}</span>}
              </button>
              <button
                onClick={() => setTab('private')}
                className={`${styles.tab} ${tab === 'private' ? styles.active : ''}`}
              >
                <FaCircle />
                <span>Chats</span>
                {chats.filter((c) => c.type === 'private').length > 0 && (
                  <span className={styles.count}>{chats.filter((c) => c.type === 'private').length}</span>
                )}
              </button>
              <button
                onClick={() => setTab('groups')}
                className={`${styles.tab} ${tab === 'groups' ? styles.active : ''}`}
              >
                <FaUsers />
                <span>Groups</span>
                {chats.filter((c) => c.type !== 'private').length > 0 && (
                  <span className={styles.count}>{chats.filter((c) => c.type !== 'private').length}</span>
                )}
              </button>
            </div>

            <div className={styles.searchBox}>
              <FaSearch />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={styles.clearBtn} aria-label="Clear">
                  ×
                </button>
              )}
            </div>
          </motion.header>

          {/* Admin Banner */}
          {isAdmin && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Link href="/admin/chats" className={styles.officialBanner}>
                <FaBullhorn />
                <span>Manage Official Chats & Broadcasts</span>
              </Link>
            </motion.div>
          )}

          {/* Chat List */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                className={styles.loading}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className={styles.spinner} />
                <p>Loading conversations...</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                className={styles.empty}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className={styles.emptyIcon}>
                  <FaComments />
                </div>
                <h3>No conversations yet</h3>
                <p>Start connecting with people in your community</p>
                <Link href="/community/new" className={styles.emptyBtn}>
                  <FaPlus />
                  Start a conversation
                </Link>
              </motion.div>
            ) : (
              <motion.div
                className={styles.chatList}
                variants={container}
                initial="hidden"
                animate="show"
              >
                {filtered.map((chat) => (
                  <motion.div key={chat.id} variants={item} layout>
                    <Link href={`/community/${chat.id}`} className={styles.chatItem}>
                      <div className={styles.avatarWrap}>
                        <SafeImage
                          src={
                            chat.type === 'private'
                              ? chat.otherUserPhoto || '/images/default-avatar.png'
                              : chat.photoURL || '/images/default-group.png'
                          }
                          width={56}
                          height={56}
                          alt={chat.type === 'private' ? chat.otherUserName || 'Chat' : chat.name || 'Chat'}
                          className={styles.avatar}
                        />
                        {chat.type === 'private' && chat.isOnline && (
                          <span className={styles.onlineDot} title="Online" />
                        )}
                        {chat.type !== 'private' && chat.isOfficial && (
                          <span className={styles.officialBadge} title="Official">
                            <FaCheckCircle />
                          </span>
                        )}
                      </div>

                      <div className={styles.chatInfo}>
                        <div className={styles.chatHeader}>
                          <h3>{chat.type === 'private' ? chat.otherUserName : chat.name}</h3>
                          <span className={styles.time}>
                            <FaClock />
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        </div>

                        <div className={styles.chatPreview}>
                          {chat.isTyping ? (
                            <span className={styles.typing}>
                              typing
                              <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              >
                                ...
                              </motion.span>
                            </span>
                          ) : (
                            <p className={styles.message}>{chat.lastMessage || 'Say hello 👋'}</p>
                          )}
                        </div>
                      </div>

                      {chat.unreadCount > 0 && (
                        <span className={styles.unreadBadge}>
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}

                      {chat.type !== 'private' && (
                        <div className={styles.groupIcon}>
                          <FaUsers />
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    </AuthGuard>
  );
}
