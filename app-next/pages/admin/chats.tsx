import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { collection, getDocs, query, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { FaSearch, FaTrash, FaComments } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/Admin.module.css';

interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participants: string[];
  participantNames: string[];
  lastMessage: string;
  updatedAt: Date;
  isOfficial?: boolean;
}

export default function ChatsMonitor() {
  const { db } = getFirebaseClient();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const loadChats = async () => {
      try {
        const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: (data.type === 'group' ? 'group' : 'private') as Chat['type'],
            name: data.name || 'Chat',
            participants: data.participants || [],
            participantNames: data.participantNames || [],
            lastMessage: data.lastMessage || '',
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
            isOfficial: data.isOfficial || false,
          };
        });
        setChats(list);
        setFilteredChats(list);
      } catch (e) {
        console.error('Failed to load chats:', e);
        toast.error('Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [db]);

  useEffect(() => {
    const filtered = chats.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.participantNames.some((name) => name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  const handleDeleteChat = async (chat: Chat) => {
    if (!confirm(`Delete chat: ${chat.name}?`)) return;

    try {
      await deleteDoc(doc(db!, 'chats', chat.id));
      toast.success('Chat deleted');
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
    } catch (e) {
      console.error('Failed to delete chat:', e);
      toast.error('Failed to delete chat');
    }
  };

  return (
    <AdminGuard>
      <Layout title="Chats Monitor - Admin">
        <div className={styles.admin}>
          <div className={styles.header}>
            <div>
              <h1><FaComments /> Chats Monitor</h1>
              <p>Monitor and manage chat rooms</p>
            </div>
          </div>

          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>Loading chats...</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Chat Name</th>
                    <th>Type</th>
                    <th>Participants</th>
                    <th>Last Message</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChats.map((chat) => (
                    <tr key={chat.id}>
                      <td>{chat.name || 'Private Chat'}</td>
                      <td>
                        <span className={chat.type === 'group' ? styles.groupBadge : styles.privateBadge}>
                          {chat.type === 'group' ? 'Group' : 'Private'}
                        </span>
                      </td>
                      <td>{chat.participantNames.join(', ')}</td>
                      <td className={styles.truncate}>{chat.lastMessage || 'No messages'}</td>
                      <td>{chat.updatedAt.toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteChat(chat)}
                          className={styles.iconBtnDanger}
                          title="Delete Chat"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredChats.length === 0 && <p className={styles.noData}>No chats found</p>}
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
