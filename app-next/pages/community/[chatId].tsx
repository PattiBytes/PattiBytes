import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaPaperPlane, FaImage, FaArrowLeft, FaEllipsisV } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/Chat.module.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text: string;
  mediaUrl?: string;
  createdAt: Date;
  read: string[];
}

interface ChatInfo {
  name: string;
  photoURL: string;
  type: 'private' | 'group';
  participants: string[];
  isOfficial?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const { chatId } = router.query;
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat info and messages
  useEffect(() => {
    if (!chatId || typeof chatId !== 'string' || !user) return;

    const { db } = getFirebaseClient();
    if (!db) return;

    // Load chat info
    getDoc(doc(db, 'chats', chatId)).then(docSnap => {
      if (docSnap.exists()) {
        setChatInfo(docSnap.data() as ChatInfo);
      }
    });

    // Listen to messages
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Message[];

      setMessages(loadedMessages);
      
      // Mark as read
      loadedMessages.forEach(msg => {
        if (msg.senderId !== user.uid && !msg.read.includes(user.uid)) {
          updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), {
            read: [...msg.read, user.uid]
          });
        }
      });
    });

    return () => unsubscribe();
  }, [chatId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userProfile || !chatId || typeof chatId !== 'string') return;

    setSending(true);
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      // Add message
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: userProfile.displayName,
        senderPhoto: userProfile.photoURL,
        text: newMessage,
        createdAt: serverTimestamp(),
        read: [user.uid]
      });

      // Update chat last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!chatInfo) {
    return (
      <AuthGuard>
        <Layout title="Loading...">
          <div className={styles.loading}>Loading chat...</div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout title={`${chatInfo.name} - PattiBytes`}>
        <div className={styles.chatPage}>
          {/* Chat Header */}
          <div className={styles.chatHeader}>
            <Link href="/community" className={styles.backBtn}>
              <FaArrowLeft />
            </Link>
            <SafeImage 
              src={chatInfo.photoURL} 
              alt={chatInfo.name} 
              width={40} 
              height={40}
              className={styles.chatAvatar}
            />
            <div className={styles.chatInfo}>
              <h2>{chatInfo.name}</h2>
              {chatInfo.isOfficial && <span className={styles.officialBadge}>Official</span>}
            </div>
            <button className={styles.menuBtn}>
              <FaEllipsisV />
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map((message, index) => {
              const isOwn = message.senderId === user?.uid;
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

              return (
                <motion.div
                  key={message.id}
                  className={`${styles.message} ${isOwn ? styles.ownMessage : styles.otherMessage}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  {!isOwn && showAvatar && (
                    <SafeImage 
                      src={message.senderPhoto} 
                      alt={message.senderName} 
                      width={32} 
                      height={32}
                      className={styles.messageAvatar}
                    />
                  )}
                  <div className={styles.messageBubble}>
                    {!isOwn && showAvatar && (
                      <span className={styles.senderName}>{message.senderName}</span>
                    )}
                    <p>{message.text}</p>
                    <span className={styles.messageTime}>
                      {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form className={styles.messageInput} onSubmit={handleSend}>
            <button type="button" className={styles.attachBtn}>
              <FaImage />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
            />
            <button type="submit" disabled={sending || !newMessage.trim()}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </Layout>
    </AuthGuard>
  );
}
