import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { searchUsersByUsername } from '@/lib/username';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { FaSearch, FaUsers, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/NewChat.module.css';

interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
}

export default function NewChat() {
  const router = useRouter();
  const { user: currentUser, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(searchQuery, 10);
        setUsers(results.filter(u => u.uid !== currentUser?.uid));
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  const handleCreateChat = async () => {
    if (!currentUser || !userProfile || selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const participants = [currentUser.uid, ...selectedUsers.map(u => u.uid)];
      const chatType = isGroup ? 'group' : 'private';

      // Check if private chat already exists
      if (chatType === 'private') {
        const existingChatQuery = query(
          collection(db, 'chats'),
          where('type', '==', 'private'),
          where('participants', 'array-contains', currentUser.uid)
        );
        
        const snapshot = await getDocs(existingChatQuery);
        const existingChat = snapshot.docs.find(doc => {
          const data = doc.data();
          return data.participants.includes(selectedUsers[0].uid);
        });

        if (existingChat) {
          router.push(`/community/${existingChat.id}`);
          return;
        }
      }

      // Create new chat
      const chatDoc = await addDoc(collection(db, 'chats'), {
        type: chatType,
        name: isGroup ? groupName : selectedUsers[0].displayName,
        photoURL: isGroup ? '/images/group-default.png' : selectedUsers[0].photoURL,
        participants,
        lastMessage: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isOfficial: false
      });

      router.push(`/community/${chatDoc.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  const toggleUser = (user: User) => {
    setSelectedUsers(prev => 
      prev.find(u => u.uid === user.uid)
        ? prev.filter(u => u.uid !== user.uid)
        : [...prev, user]
    );
  };

  return (
    <AuthGuard>
      <Layout title="New Chat - PattiBytes">
        <div className={styles.newChat}>
          <div className={styles.header}>
            <Link href="/community" className={styles.backBtn}>
              <FaArrowLeft />
            </Link>
            <h1>New Chat</h1>
          </div>

          <div className={styles.typeToggle}>
            <button
              className={!isGroup ? styles.active : ''}
              onClick={() => setIsGroup(false)}
            >
              Private Chat
            </button>
            <button
              className={isGroup ? styles.active : ''}
              onClick={() => setIsGroup(true)}
            >
              <FaUsers /> Group Chat
            </button>
          </div>

          {isGroup && (
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={styles.groupNameInput}
            />
          )}

          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className={styles.selected}>
              <h3>Selected ({selectedUsers.length})</h3>
              <div className={styles.selectedList}>
                {selectedUsers.map(user => (
                  <div key={user.uid} className={styles.selectedUser}>
                    <SafeImage src={user.photoURL} alt={user.displayName} width={32} height={32} />
                    <span>{user.username}</span>
                    <button onClick={() => toggleUser(user)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.usersList}>
            {users.map(user => (
              <div
                key={user.uid}
                className={`${styles.userItem} ${selectedUsers.find(u => u.uid === user.uid) ? styles.selected : ''}`}
                onClick={() => toggleUser(user)}
              >
                <SafeImage src={user.photoURL} alt={user.displayName} width={48} height={48} />
                <div className={styles.userInfo}>
                  <h4>{user.displayName}</h4>
                  <p>@{user.username}</p>
                </div>
              </div>
            ))}
          </div>

          {selectedUsers.length > 0 && (
            <button
              className={styles.createBtn}
              onClick={handleCreateChat}
              disabled={creating || (isGroup && !groupName.trim())}
            >
              {creating ? 'Creating...' : 'Create Chat'}
            </button>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
