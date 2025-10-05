import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { FaPlus, FaUsers, FaSearch } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/Community.module.css';

interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  photoURL?: string;
  participants: string[];
  lastMessage: string;
  updatedAt: Date;
  isOfficial?: boolean;
}

export default function Community() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const { db } = getFirebaseClient();
    if (!db) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const loadedChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Chat[];

      setChats(loadedChats);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <AuthGuard>
      <Layout title="Community - PattiBytes">
        <div className={styles.community}>
          <div className={styles.header}>
            <h1>Community</h1>
            <Link href="/community/new" className={styles.newBtn}>
              <FaPlus /> New Chat
            </Link>
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

          <div className={styles.chatsList}>
            {chats
              .filter(chat => 
                chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(chat => (
                <Link 
                  key={chat.id} 
                  href={`/community/${chat.id}`}
                  className={styles.chatItem}
                >
                  {chat.isOfficial && (
                    <div className={styles.officialBadge}>Official</div>
                  )}
                  <SafeImage 
                    src={chat.photoURL || '/images/group-default.png'} 
                    alt={chat.name || 'Chat'} 
                    width={56} 
                    height={56}
                    className={styles.chatAvatar}
                  />
                  <div className={styles.chatInfo}>
                    <div className={styles.chatTop}>
                      <h3>{chat.name}</h3>
                      <span className={styles.chatTime}>
                        {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={styles.lastMessage}>{chat.lastMessage}</p>
                  </div>
                  {chat.type === 'group' && (
                    <FaUsers className={styles.groupIcon} />
                  )}
                </Link>
              ))}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
