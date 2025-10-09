import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { FaUsers, FaPlus, FaCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import styles from '@/styles/AdminEnhanced.module.css';

interface OfficialChat {
  id: string;
  name: string;
  participantCount: number;
  createdAt: Date;
}

export default function OfficialChat() {
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [chatName, setChatName] = useState('Official Announcements');
  const [officialChats, setOfficialChats] = useState<OfficialChat[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!db) return;
    const loadChats = async () => {
      const q = query(collection(db, 'chats'), where('isOfficial', '==', true));
      const snap = await getDocs(q);
      const chats = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || 'Official Chat',
        participantCount: (d.data().participants || []).length,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));
      setOfficialChats(chats);
    };
    loadChats();
  }, [db]);

  const createOfficialGroupChat = async () => {
    if (!db || !user || !chatName.trim()) {
      toast.error('Chat name is required');
      return;
    }

    setCreating(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUserIds = usersSnap.docs.map((d) => d.id);
      const allUserNames = usersSnap.docs.map((d) => d.data().displayName || 'User');
      const allUserPhotos = usersSnap.docs.map((d) => d.data().photoURL || '/images/default-avatar.png');

      await addDoc(collection(db, 'chats'), {
        name: chatName,
        type: 'group',
        isOfficial: true,
        participants: allUserIds,
        participantNames: allUserNames,
        participantPhotos: allUserPhotos,
        lastMessage: 'Official group created',
        lastMessageSenderId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`Official chat created with ${allUserIds.length} members!`);
      setChatName('Official Announcements');

      const q = query(collection(db, 'chats'), where('isOfficial', '==', true));
      const snap = await getDocs(q);
      const chats = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || 'Official Chat',
        participantCount: (d.data().participants || []).length,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));
      setOfficialChats(chats);
    } catch (e) {
      console.error('Failed to create official chat:', e);
      toast.error('Failed to create official chat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminGuard>
      <Layout title="Official Chat - Admin">
        <div className={styles.admin}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1>
                <FaUsers /> Official Group Chat
              </h1>
              <p>Create and manage official group chats for all users</p>
            </div>
          </motion.div>

          <motion.div
            className={styles.officialChatCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2>
              <FaPlus /> Create Official Group
            </h2>
            <div className={styles.formGroup}>
              <label>Group Name</label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Official Announcements"
                className={styles.input}
              />
            </div>

            <div className={styles.infoBox}>
              <FaCheck /> All registered users will automatically be added to this group
            </div>

            <button onClick={createOfficialGroupChat} disabled={creating} className={styles.primaryBtn}>
              {creating ? 'Creating...' : 'Create Official Group Chat'}
            </button>
          </motion.div>

          <motion.div
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2>Existing Official Chats</h2>
            {officialChats.length === 0 ? (
              <p className={styles.noData}>No official chats yet</p>
            ) : (
              <div className={styles.chatsList}>
                {officialChats.map((chat) => (
                  <div key={chat.id} className={styles.chatCard}>
                    <div className={styles.chatInfo}>
                      <h3>{chat.name}</h3>
                      <p>{chat.participantCount} members</p>
                      <span>Created {chat.createdAt.toLocaleDateString()}</span>
                    </div>
                    <a href={`/community/${chat.id}`} className={styles.viewBtn}>
                      Open Chat
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
