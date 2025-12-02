// app-next/pages/admin/official-chat.tsx - COMPLETE OFFICIAL CHAT MANAGEMENT
import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import {
  FaUsers,
  FaPlus,
  FaCheck,
  FaTrash,
  FaSync,
  FaUserCheck,
  FaEnvelope,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import styles from '@/styles/AdminOfficialChat.module.css';

interface OfficialChat {
  id: string;
  name: string;
  description: string;
  participantCount: number;
  messageCount: number;
  createdAt: Date;
  isActive: boolean;
}

interface OfficialChatForm {
  name: string;
  description: string;
}

export default function OfficialChat() {
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [formData, setFormData] = useState<OfficialChatForm>({
    name: 'Official Announcements',
    description: 'Main channel for official platform announcements',
  });
  const [officialChats, setOfficialChats] = useState<OfficialChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadOfficialChats = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'chats'), where('isOfficial', '==', true));
      const snap = await getDocs(q);
      const chats: OfficialChat[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Official Chat',
          description: data.description || '',
          participantCount: (data.participants || []).length,
          messageCount: data.messageCount || 0,
          createdAt:
            data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          isActive: data.isActive !== false,
        };
      });
      setOfficialChats(chats);
    } catch (error) {
      console.error('Failed to load official chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  loadOfficialChats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [db]);

  const createOfficialGroupChat = async () => {
    if (!db || !user || !formData.name.trim()) {
      toast.error('Chat name is required');
      return;
    }

    setCreating(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUserIds = usersSnap.docs.map((d) => d.id);
      const allUserNames = usersSnap.docs.map((d) => d.data().displayName || 'User');
      const allUserPhotos = usersSnap.docs.map(
        (d) => d.data().photoURL || '/images/default-avatar.png'
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const docRef = await addDoc(collection(db, 'chats'), {
        name: formData.name,
        description: formData.description,
        type: 'group',
        isOfficial: true,
        participants: allUserIds,
        participantNames: allUserNames,
        participantPhotos: allUserPhotos,
        lastMessage: 'Official group created',
        lastMessageSenderId: user.uid,
        lastMessageTime: serverTimestamp(),
        messageCount: 0,
        isActive: true,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`Official chat created with ${allUserIds.length} members!`);

      // Reload chats
      await loadOfficialChats();

      // Reset form
      setFormData({
        name: 'Official Announcements',
        description: 'Main channel for official platform announcements',
      });
    } catch (error) {
      console.error('Failed to create official chat:', error);
      toast.error('Failed to create official chat');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChat = async (chatId: string, chatName: string) => {
    if (!window.confirm(`Delete official chat "${chatName}"? This cannot be undone.`)) return;

    try {
      if (!db) return;
      await deleteDoc(doc(db, 'chats', chatId));
      toast.success('Chat deleted');
      setOfficialChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
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
                <FaUsers /> Official Group Chats
              </h1>
              <p>Create and manage official group chats for all users</p>
            </div>
          </motion.div>

          {/* Create New Chat */}
          <motion.div
            className={styles.createCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2>
              <FaPlus /> Create New Official Chat
            </h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Chat Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Official Announcements"
                  maxLength={100}
                  className={styles.input}
                />
                <small>{formData.name.length} / 100</small>
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of this group..."
                  maxLength={250}
                  rows={3}
                  className={styles.textarea}
                />
                <small>{formData.description.length} / 250</small>
              </div>
            </div>

            <div className={styles.infoBox}>
              <FaUserCheck /> All registered users will automatically be added to this group
            </div>

            <button
              onClick={createOfficialGroupChat}
              disabled={creating || !formData.name.trim()}
              className={styles.primaryBtn}
            >
              {creating ? 'Creating...' : 'Create Official Chat'}
            </button>
          </motion.div>

          {/* Existing Chats */}
          <motion.div
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.sectionHeader}>
              <h2>Existing Official Chats ({officialChats.length})</h2>
              <button
                onClick={loadOfficialChats}
                className={styles.refreshBtn}
                title="Refresh"
              >
                <FaSync />
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <FaSync />
                </motion.div>
                <p>Loading chats...</p>
              </div>
            ) : officialChats.length === 0 ? (
              <div className={styles.emptyState}>
                <FaUsers />
                <p>No official chats yet</p>
              </div>
            ) : (
              <div className={styles.chatsList}>
                <AnimatePresence>
                  {officialChats.map((chat, idx) => (
                    <motion.div
                      key={chat.id}
                      className={styles.chatCard}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className={styles.chatContent}>
                        <h3>{chat.name}</h3>
                        {chat.description && <p>{chat.description}</p>}

                        <div className={styles.chatStats}>
                          <span>
                            <FaUsers /> {chat.participantCount} members
                          </span>
                          <span>
                            <FaEnvelope /> {chat.messageCount} messages
                          </span>
                          <span>
                            {chat.createdAt.toLocaleDateString()}
                          </span>
                        </div>

                        {chat.isActive && (
                          <span className={styles.activeBadge}>
                            <FaCheck /> Active
                          </span>
                        )}
                      </div>

                      <div className={styles.actions}>
                        <a
                          href={`/community/${chat.id}`}
                          className={styles.viewBtn}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Chat
                        </a>
                        <button
                          onClick={() => handleDeleteChat(chat.id, chat.name)}
                          className={styles.deleteBtn}
                          title="Delete Chat"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
