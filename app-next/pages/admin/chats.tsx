// app-next/pages/admin/chats.tsx - FIXED COMPLETE
import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { FaSearch, FaTrash, FaComments, FaFilter, FaSyncAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/styles/AdminChats.module.css';

interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participants: string[];
  participantCount: number;
  lastMessage: string;
  updatedAt: Date;
  isOfficial?: boolean;
  messageCount?: number;
}

type ChatFilter = 'all' | 'private' | 'group' | 'official';

export default function ChatsMonitor() {
  const { db } = getFirebaseClient();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [loading, setLoading] = useState(true);

  const loadChats = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'), limit(500));
      const snap = await getDocs(q);
      const list: Chat[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: (data.type === 'group' ? 'group' : 'private') as Chat['type'],
          name: data.name || 'Chat',
          participants: data.participants || [],
          participantCount: (data.participants || []).length,
          lastMessage: data.lastMessage || 'No messages',
          updatedAt:
            data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
          isOfficial: data.isOfficial || false,
          messageCount: data.messageCount || 0,
        };
      });
      setChats(list);
      applyFilters(list, searchQuery, filter);
    } catch {
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (chatList: Chat[], search: string, filterType: ChatFilter) => {
    let filtered = chatList;

    if (filterType === 'private') {
      filtered = filtered.filter((c) => c.type === 'private');
    } else if (filterType === 'group') {
      filtered = filtered.filter((c) => c.type === 'group');
    } else if (filterType === 'official') {
      filtered = filtered.filter((c) => c.isOfficial);
    }

    if (search.trim()) {
      filtered = filtered.filter((c) =>
        (c.name || '').toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredChats(filtered);
  };

  useEffect(() => {
  loadChats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [db]); // Keep db as only dependency

  useEffect(() => {
    applyFilters(chats, searchQuery, filter);
  }, [searchQuery, filter, chats]);

  const handleDeleteChat = async (chat: Chat) => {
    if (!window.confirm(`Delete chat "${chat.name}"?`)) return;

    try {
      if (!db) return;
      await deleteDoc(doc(db, 'chats', chat.id));
      toast.success('Chat deleted');
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  return (
    <AdminGuard>
      <Layout title="Chats Monitor - Admin">
        <div className={styles.container}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1>
                <FaComments /> Chats Monitor
              </h1>
              <p>Monitor and manage all chat rooms</p>
            </div>
            <button onClick={loadChats} className={styles.refreshBtn}>
              <FaSyncAlt />
            </button>
          </motion.div>

          <motion.div
            className={styles.controls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.searchBox}>
              <FaSearch />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <FaFilter />
              <select value={filter} onChange={(e) => setFilter(e.target.value as ChatFilter)}>
                <option value="all">All Chats ({chats.length})</option>
                <option value="private">Private</option>
                <option value="group">Group</option>
                <option value="official">Official</option>
              </select>
            </div>
          </motion.div>

          {loading ? (
            <div className={styles.loading}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity }}>
                <FaSyncAlt />
              </motion.div>
              <p>Loading chats...</p>
            </div>
          ) : (
            <motion.div
              className={styles.chatsGrid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimatePresence>
                {filteredChats.map((chat, idx) => (
                  <motion.div
                    key={chat.id}
                    className={styles.chatCard}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className={styles.chatHeader}>
                      <h3>{chat.name}</h3>
                      <span className={chat.type === 'group' ? styles.groupBadge : styles.privateBadge}>
                        {chat.type === 'group' ? '👥 Group' : '👤 Private'}
                      </span>
                    </div>

                    <div className={styles.chatInfo}>
                      <span>👥 {chat.participantCount} members</span>
                      <span>💬 {chat.messageCount} messages</span>
                      <span>⏰ {chat.updatedAt.toLocaleDateString()}</span>
                    </div>

                    <p className={styles.lastMessage}>{chat.lastMessage}</p>

                    <div className={styles.actions}>
                      <a href={`/community/${chat.id}`} className={styles.viewBtn}>
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteChat(chat)}
                        className={styles.deleteBtn}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {filteredChats.length === 0 && !loading && (
            <div className={styles.emptyState}>
              <FaComments />
              <h3>No chats found</h3>
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
