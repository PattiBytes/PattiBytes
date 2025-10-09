import { useState, useEffect, useMemo } from 'react';
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

// Helpers to avoid undefined reaching Firestore
const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim().length > 0 ? v : fallback;

const nonEmptyPhoto = (v?: string) => str(v, '/images/group-default.png');

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)));
}

export default function NewChat() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { db } = getFirebaseClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const normalizedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(normalizedQuery, 10);
        setUsers(results.filter((u) => u.uid !== currentUser?.uid));
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [normalizedQuery, currentUser?.uid]);

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.uid === user.uid) ? prev.filter((u) => u.uid !== user.uid) : [...prev, user]
    );
  };

  const handleCreateChat = async () => {
    if (!db || !currentUser?.uid) return;

    // Require at least one other user
    if (selectedUsers.length === 0) return;

    // For private chat, use first selected
    const target = selectedUsers[0];

    setCreating(true);
    try {
      const participants = [currentUser.uid, ...selectedUsers.map((u) => u.uid)];
      const chatType: 'private' | 'group' = isGroup ? 'group' : 'private';

      // Private chat dedup
      if (chatType === 'private') {
        const existingChatQuery = query(
          collection(db, 'chats'),
          where('type', '==', 'private'),
          where('participants', 'array-contains', currentUser.uid)
        );
        const snapshot = await getDocs(existingChatQuery);
        const existing = snapshot.docs.find((d) => {
          const data = d.data();
          const parts: string[] = Array.isArray(data.participants) ? data.participants : [];
          return parts.includes(target.uid);
        });
        if (existing) {
          router.push(`/community/${existing.id}`);
          return;
        }
      }

      // Compute safe fields
      const safeName =
        chatType === 'group'
          ? str(groupName, `Group (${selectedUsers.length + 1})`)
          : str(target.displayName || target.username, 'Chat');

      // Key change: force non-empty photo even if target.photoURL is undefined/null/empty
      const safePhoto =
        chatType === 'group'
          ? '/images/group-default.png'
          : nonEmptyPhoto(target.photoURL);

      // Final payload with no undefined
      const payload = sanitizeForFirestore({
        type: chatType,
        name: safeName,
        photoURL: safePhoto, // guaranteed string
        participants, // array of strings
        lastMessage: '', // string
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isOfficial: false,
      });

      const chatDoc = await addDoc(collection(db, 'chats'), payload);
      router.push(`/community/${chatDoc.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat');
    } finally {
      setCreating(false);
    }
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
            <button className={!isGroup ? styles.active : ''} onClick={() => setIsGroup(false)}>
              Private Chat
            </button>
            <button className={isGroup ? styles.active : ''} onClick={() => setIsGroup(true)}>
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
                {selectedUsers.map((u) => (
                  <div key={u.uid} className={styles.selectedUser}>
                    <SafeImage src={nonEmptyPhoto(u.photoURL)} alt={u.displayName} width={32} height={32} />
                    <span>@{u.username}</span>
                    <button onClick={() => toggleUser(u)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.usersList}>
            {users.map((u) => {
              const active = selectedUsers.find((x) => x.uid === u.uid);
              return (
                <div
                  key={u.uid}
                  className={`${styles.userItem} ${active ? styles.selected : ''}`}
                  onClick={() => toggleUser(u)}
                >
                  <SafeImage src={nonEmptyPhoto(u.photoURL)} alt={u.displayName} width={48} height={48} />
                  <div className={styles.userInfo}>
                    <h4>{u.displayName}</h4>
                    <p>@{u.username}</p>
                  </div>
                </div>
              );
            })}
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
