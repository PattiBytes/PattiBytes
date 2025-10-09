import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { useAuth } from '@/context/AuthContext';
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  orderBy,
  query,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  Timestamp,
  setDoc,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { FaPaperPlane, FaImage, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/ChatRoom.module.css';

interface ChatMeta {
  id: string;
  participants: string[];
  participantNames: string[];
  participantPhotos: string[];
  isGroup: boolean;
  updatedAt: Date;
}

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  senderId: string;
  createdAt: Date;
}

export default function ChatRoom() {
  const router = useRouter();
  const { chatId } = router.query;
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [chat, setChat] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [pageCursor, setPageCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!db || !chatId || typeof chatId !== 'string') {
      setLoading(false);
      return;
    }

    const chatRef = doc(db, 'chats', chatId);
    getDoc(chatRef)
      .then(snap => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }
        const data = snap.data();
        setChat({
          id: snap.id,
          participants: data.participants || [],
          participantNames: data.participantNames || [],
          participantPhotos: data.participantPhotos || [],
          isGroup: data.isGroup || false,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [db, chatId]);

  useEffect(() => {
    if (!db || !chatId || typeof chatId !== 'string') return;

    const msgRef = collection(db, 'chats', chatId, 'messages');
    const q = query(msgRef, orderBy('createdAt', 'asc'), limit(50));
    const unsub = onSnapshot(q, snap => {
      const items: Message[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          text: d.text,
          imageUrl: d.imageUrl,
          senderId: d.senderId,
          createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
        });
      });
      setMessages(items);
      setTimeout(() => scrollToBottom(), 100);
    });
    return () => unsub();
  }, [db, chatId, scrollToBottom]);

  const loadMore = async () => {
    if (!db || !chatId || typeof chatId !== 'string' || !hasMore) return;

    const msgRef = collection(db, 'chats', chatId, 'messages');
    if (!pageCursor && messages.length > 0) {
      const firstDocSnap = await getDocs(query(msgRef, orderBy('createdAt', 'asc'), limit(1)));
      if (!firstDocSnap.empty) setPageCursor(firstDocSnap.docs[0]);
    }
    if (!pageCursor) return;

    const qMore = query(msgRef, orderBy('createdAt', 'asc'), startAfter(pageCursor), limit(50));
    const snap = await getDocs(qMore);
    if (snap.empty) {
      setHasMore(false);
      return;
    }

    const newMsgs: Message[] = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      newMsgs.push({
        id: docSnap.id,
        text: d.text,
        imageUrl: d.imageUrl,
        senderId: d.senderId,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
      });
    });
    setMessages(prev => [...prev, ...newMsgs]);
    setPageCursor(snap.docs[snap.docs.length - 1]);
  };

  const sendMessage = async (payload: { text?: string; imageUrl?: string }) => {
    if (!db || !user?.uid || !chatId || typeof chatId !== 'string') return;
    if (!payload.text && !payload.imageUrl) return;

    setSending(true);
    try {
      const msgRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(msgRef, {
        text: payload.text || '',
        imageUrl: payload.imageUrl || '',
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: payload.text ? payload.text.slice(0, 100) : '[image]',
        lastMessageSenderId: user.uid,
        updatedAt: serverTimestamp(),
      });

      setInput('');
      scrollToBottom();
    } catch (e) {
      console.error('Send message error:', e);
    } finally {
      setSending(false);
    }
  };

  const onPickImage = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadToCloudinary(f);
      await sendMessage({ imageUrl: url });
    } catch (e) {
      console.error('Image upload error:', e);
    } finally {
      if (ev.target) ev.target.value = '';
    }
  };

  const setTyping = async (isTyping: boolean) => {
    if (!db || !chatId || typeof chatId !== 'string' || !user?.uid) return;
    const typingRef = doc(db, 'chats', chatId, 'typing', user.uid);
    await setDoc(typingRef, { typing: isTyping, at: serverTimestamp() }, { merge: true });

    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping) {
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    }
  };

  useEffect(() => {
    if (!db || !chatId || typeof chatId !== 'string' || !user?.uid) return;
    const typingCol = collection(db, 'chats', chatId, 'typing');
    const unsub = onSnapshot(typingCol, snap => {
      const usersTyping: string[] = [];
      snap.forEach(docSnap => {
        if (docSnap.id === user.uid) return;
        const d = docSnap.data();
        if (d.typing) usersTyping.push(docSnap.id);
      });
      setTypingUsers(usersTyping);
    });
    return () => unsub();
  }, [db, chatId, user?.uid]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading chat - PattiBytes">
          <div className={styles.center}>Loading chat…</div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!chat) {
    return (
      <AuthGuard>
        <Layout title="Chat not found - PattiBytes">
          <div className={styles.center}>Chat not found</div>
        </Layout>
      </AuthGuard>
    );
  }

  const myIndex = user?.uid ? chat.participants.indexOf(user.uid) : -1;
  const otherIndex = myIndex === 0 ? 1 : 0;
  const otherName = chat.isGroup ? 'Group Chat' : chat.participantNames[otherIndex] || 'User';
  const otherPhoto = chat.participantPhotos[otherIndex] || '/images/default-avatar.png';

  return (
    <AuthGuard>
      <Layout title={`${otherName} - PattiBytes`}>
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <Link href="/community" className={styles.backBtn}>
              <FaArrowLeft />
            </Link>
            <div className={styles.user}>
              <SafeImage src={otherPhoto} alt={otherName} width={40} height={40} className={styles.avatar} />
              <div>
                <h3>{otherName}</h3>
                {typingUsers.length > 0 && <span className={styles.typing}>typing…</span>}
              </div>
            </div>
          </div>

          <div className={styles.messages} id="messages">
            <button className={styles.loadMore} onClick={loadMore} disabled={!hasMore}>Load older</button>

            {messages.map(m => {
              const mine = m.senderId === user?.uid;
              return (
                <div key={m.id} className={`${styles.message} ${mine ? styles.mine : styles.theirs}`}>
                  {m.imageUrl && (
                    <div className={styles.imageBubble}>
                      <SafeImage src={m.imageUrl} alt="image" width={320} height={220} />
                    </div>
                  )}
                  {m.text && <div className={styles.bubble}>{m.text}</div>}
                  <div className={styles.time}>{m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className={styles.composer}>
            <label className={styles.attachBtn}>
              <FaImage />
              <input type="file" accept="image/*" onChange={onPickImage} />
            </label>
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                void setTyping(e.target.value.length > 0);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && input.trim() && !e.shiftKey) {
                  e.preventDefault();
                  await sendMessage({ text: input.trim() });
                }
              }}
              placeholder="Type a message"
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage({ text: input.trim() })}
              disabled={!input.trim() || sending}
              aria-label="Send"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
