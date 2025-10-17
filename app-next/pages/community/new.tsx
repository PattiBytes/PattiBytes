// app-next/pages/community/new.tsx
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { searchUsersByUsername } from '@/lib/username';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { FaSearch, FaUsers, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface UserResult {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string | null;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim().length > 0 ? v : fallback);
const nonEmptyPhoto = (v?: string | null) => str(v ?? '', '/images/group-default.png');
function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)));
}

export default function NewChat() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { db } = getFirebaseClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);

  const normalizedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsersByUsername(normalizedQuery, 10);
        setUsers(results.filter((u) => u.uid !== currentUser?.uid));
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [normalizedQuery, currentUser?.uid]);

  const toggleUser = (u: UserResult) => {
    setSelectedUsers((prev) => (prev.find((x) => x.uid === u.uid) ? prev.filter((x) => x.uid !== u.uid) : [...prev, u]));
  };

  const handleCreateChat = async () => {
    if (!db || !currentUser?.uid) return;
    if (selectedUsers.length === 0) {
      toast.error('Select at least one user');
      return;
    }

    const target = selectedUsers[0];

    setCreating(true);
    try {
      const participants = [currentUser.uid, ...selectedUsers.map((u) => u.uid)];
      const chatType: 'private' | 'group' = isGroup ? 'group' : 'private';

      // Dedup existing private chat: BOUNDED + ORDERED per rules
      if (chatType === 'private') {
        const existingQ = query(
          collection(db, 'chats'),
          where('type', '==', 'private'),
          where('participants', 'array-contains', currentUser.uid),
          orderBy('updatedAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(existingQ);
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

      const safeName =
        chatType === 'group' ? str(groupName, `Group (${selectedUsers.length + 1})`) : str(target.displayName || target.username, 'Chat');
      const safePhoto = chatType === 'group' ? '/images/group-default.png' : nonEmptyPhoto(target.photoURL ?? '');

      const payload = sanitizeForFirestore({
        type: chatType,
        name: safeName,
        photoURL: safePhoto,
        participants,
        lastMessage: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageTime: serverTimestamp(),
        isOfficial: false,
        ...participants.reduce((acc, uid) => ({ ...acc, [`unread_${uid}`]: 0 }), {} as Record<string, number>),
      });

      const chatDoc = await addDoc(collection(db, 'chats'), payload);
      toast.success('Chat created!');
      router.push(`/community/${chatDoc.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title="New Chat - PattiBytes">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 12, margin: '12px 0 16px' }}>
            <Link href="/community" aria-label="Back" style={{ width: 36, height: 36, borderRadius: 10, display: 'inline-grid', placeItems: 'center', border: '1px solid var(--border,#e5e7eb)', textDecoration: 'none', color: 'inherit' }}>
              <FaArrowLeft />
            </Link>
            <h1 style={{ margin: 0 }}>New Chat</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <button style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', background: isGroup ? '' : 'rgba(102,126,234,.12)', cursor: 'pointer' }} onClick={() => setIsGroup(false)}>
              Private Chat
            </button>
            <button style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', background: isGroup ? 'rgba(102,126,234,.12)' : '', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setIsGroup(true)}>
              <FaUsers /> Group Chat
            </button>
          </div>

          {isGroup && (
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', marginBottom: 12, outline: 'none' }}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center', border: '1px solid var(--border,#e5e7eb)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            {searching ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSearch />}
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          {selectedUsers.length > 0 && (
            <div style={{ border: '1px solid var(--border,#e5e7eb)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 8px' }}>Selected ({selectedUsers.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedUsers.map((u) => (
                  <div key={u.uid} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border,#e5e7eb)' }}>
                    <SafeImage src={nonEmptyPhoto(u.photoURL ?? '')} alt={u.displayName} width={32} height={32} style={{ borderRadius: 999 }} />
                    <span>@{u.username}</span>
                    <button onClick={() => toggleUser(u)} aria-label="Remove" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {users.map((u) => {
              const active = selectedUsers.find((x) => x.uid === u.uid);
              return (
                <div
                  key={u.uid}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: 10,
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 12,
                    border: '1px solid var(--border,#e5e7eb)',
                    cursor: 'pointer',
                    outline: active ? '2px solid #667eea' : undefined,
                  }}
                  onClick={() => toggleUser(u)}
                >
                  <SafeImage src={nonEmptyPhoto(u.photoURL ?? '')} alt={u.displayName} width={48} height={48} style={{ borderRadius: 999 }} />
                  <div>
                    <h4 style={{ margin: 0 }}>{u.displayName}</h4>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>@{u.username}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedUsers.length > 0 && (
            <button
              onClick={handleCreateChat}
              disabled={creating || (isGroup && !groupName.trim())}
              style={{ marginTop: 16, width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating || (isGroup && !groupName.trim()) ? 0.5 : 1 }}
            >
              {creating ? 'Creating...' : 'Create Chat'}
            </button>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
