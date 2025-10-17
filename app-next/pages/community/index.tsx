// app-next/pages/community/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, doc, getDoc, type DocumentData, type Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { FaPlus, FaUsers, FaSearch, FaComments, FaBullhorn } from 'react-icons/fa';
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
}

export default function Community() {
  const { user, isAdmin } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'private' | 'groups'>('all');
  const { db } = getFirebaseClient();

  useEffect(() => {
    if (!user?.uid || !db) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, async (snapshot) => {
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
            isOnline: other?.isOnline || false,
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
          });
        }
      }
      setChats(list.sort((a, b) => (b.lastMessageTime?.getTime?.() || 0) - (a.lastMessageTime?.getTime?.() || 0)));
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, db]);

  const filtered = useMemo(() => {
    let result = chats;
    if (tab === 'private') result = chats.filter((c) => c.type === 'private');
    if (tab === 'groups') result = chats.filter((c) => c.type !== 'private');
    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter((c) => (c.type === 'private' ? c.otherUserName : c.name)?.toLowerCase().includes(q));
  }, [chats, tab, searchQuery]);

  return (
    <AuthGuard>
      <Layout title="Community - PattiBytes">
        <motion.div
          className={styles.community}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.title}>
                <FaComments className={styles.icon} />
                <h1>Community</h1>
              </div>
              <Link href="/community/new" className={styles.newChatBtn} title="New Chat">
                <FaPlus />
              </Link>
            </div>

            <div className={styles.tabs}>
              <button
                onClick={() => setTab('all')}
                className={`${styles.tab} ${tab === 'all' ? styles.active : ''}`}
              >
                All
              </button>
              <button
                onClick={() => setTab('private')}
                className={`${styles.tab} ${tab === 'private' ? styles.active : ''}`}
              >
                <FaComments /> Chats
              </button>
              <button
                onClick={() => setTab('groups')}
                className={`${styles.tab} ${tab === 'groups' ? styles.active : ''}`}
              >
                <FaUsers /> Groups
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
            </div>
          </header>

          {isAdmin && (
            <Link href="/admin/chats" className={styles.officialBanner}>
              <FaBullhorn /> Manage Chats
            </Link>
          )}

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
                <FaComments className={styles.emptyIcon} />
                <p>No conversations yet</p>
                <Link href="/community/new" className={styles.emptyBtn}>
                  Start a conversation
                </Link>
              </motion.div>
            ) : (
              <motion.div className={styles.chatList} layout>
                {filtered.map((chat, index) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
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
                          <motion.div
                            className={styles.onlineDot}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          />
                        )}
                      </div>

                      <div className={styles.chatInfo}>
                        <div className={styles.chatHeader}>
                          <h3>{chat.type === 'private' ? chat.otherUserName : chat.name}</h3>
                          {chat.lastMessageTime && (
                            <span className={styles.time}>
                              {chat.lastMessageTime.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                        <div className={styles.chatPreview}>
                          {chat.isTyping ? (
                            <motion.span
                              className={styles.typing}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              typing
                              <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              >
                                ...
                              </motion.span>
                            </motion.span>
                          ) : (
                            <span className={styles.message}>{chat.lastMessage || 'Say hello'}</span>
                          )}
                        </div>
                      </div>

                      {chat.unreadCount > 0 && (
                        <motion.span
                          className={styles.unreadBadge}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </motion.span>
                      )}
                      {chat.type !== 'private' && <FaUsers className={styles.groupIcon} />}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Layout>
    </AuthGuard>
  );
}
