// app-next/pages/community/[id].tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import SafeImage from '@/components/SafeImage';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { FaArrowLeft, FaPaperPlane, FaImage, FaPaperclip, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: Date;
  read?: boolean;
}

export default function CommunityChat() {
  const router = useRouter();
  const chatId = useMemo(() => (typeof router.query.id === 'string' ? router.query.id : ''), [router.query.id]);
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [chat, setChat] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [peer, setPeer] = useState<{ displayName: string; photoURL?: string; isTyping?: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load chat doc with access guard
  useEffect(() => {
    if (!db || !user || !chatId) return;
    const unsub = onSnapshot(doc(db, 'chats', chatId), async (snap) => {
      if (!snap.exists()) {
        router.replace('/community');
        return;
      }
      const data = snap.data();
      if (!Array.isArray(data.participants) || !data.participants.includes(user.uid)) {
        router.replace('/community');
        return;
      }
      setChat(data);
      if (data.type === 'private') {
        const otherId = (data.participants as string[]).find((id) => id !== user.uid);
        if (otherId) {
          const us = await getDoc(doc(db, 'users', otherId));
          const ud = us.exists() ? us.data() : null;
          const typing = data[`typing_${otherId}`] || false;
          setPeer({ displayName: ud?.displayName || 'User', photoURL: ud?.photoURL, isTyping: typing });
        }
      } else {
        setPeer({ displayName: data.name || 'Group Chat', photoURL: data.photoURL });
      }
      const unreadField = `unread_${user.uid}`;
      if (typeof data[unreadField] === 'number' && data[unreadField] > 0) {
        updateDoc(doc(db, 'chats', chatId), { [unreadField]: 0 }).catch(() => {});
      }
    });
    return () => unsub();
  }, [db, user, chatId, router]);

  // Stream messages (bounded + ordered)
  useEffect(() => {
    if (!db || !user || !chatId) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = snap.docs.map((d) => {
        const m = d.data() as DocumentData;
        return {
          id: d.id,
          senderId: m.senderId || '',
          text: m.text || '',
          imageUrl: m.imageUrl,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          createdAt: m.createdAt && typeof m.createdAt.toDate === 'function' ? (m.createdAt as Timestamp).toDate() : new Date(),
          read: m.read,
        };
      });
      setMessages(list);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    });
    return () => unsub();
  }, [db, user, chatId]);

  const setTyping = (value: boolean) => {
    if (!db || !user || !chatId) return;
    const key = `typing_${user.uid}`;
    updateDoc(doc(db, 'chats', chatId), { [key]: value }).catch(() => {});
  };

  const onInputChange = (v: string) => {
    setInput(v);
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1200);
  };

  const send = async (extraPayload?: { imageUrl?: string; fileUrl?: string; fileName?: string }) => {
    if (!db || !user || !chatId) return;
    const text = input.trim();
    if (!text && !extraPayload?.imageUrl && !extraPayload?.fileUrl) return;
    setInput('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text,
        ...extraPayload,
        createdAt: serverTimestamp(),
        read: false,
      });
      const participants: string[] = Array.isArray(chat?.participants) ? chat!.participants : [];
      const updates: Record<string, unknown> = {
        lastMessage: text || (extraPayload?.imageUrl ? '📷 Image' : extraPayload?.fileUrl ? '📎 File' : ''),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      participants.forEach((uid) => {
        if (uid !== user.uid) {
          const key = `unread_${uid}`;
          updates[key] = (chat?.[key] || 0) + 1;
        }
      });
      await updateDoc(doc(db, 'chats', chatId), updates);
      setTyping(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (e) {
      console.error('send error', e);
      toast.error('Failed to send message');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isCloudinaryConfigured()) {
      toast.error('Image upload not configured');
      return;
    }
    setUploading(true);
    try {
      // FIX: Use 'image' instead of 'chat'
      const url = await uploadToCloudinary(file, 'image');
      await send({ imageUrl: url });
      toast.success('Image sent!');
    } catch (err) {
      console.error(err);
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isCloudinaryConfigured()) {
      toast.error('File upload not configured');
      return;
    }
    setUploading(true);
    try {
      // FIX: Use 'image' instead of 'chat' (Cloudinary treats all non-video as image resource_type)
      const url = await uploadToCloudinary(file, 'image');
      await send({ fileUrl: url, fileName: file.name });
      toast.success('File sent!');
    } catch (err) {
      console.error(err);
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthGuard>
      <Layout title={peer?.displayName ? `${peer.displayName} - Chat` : 'Chat'}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 calc(70px + env(safe-area-inset-bottom))' }}>
          <header style={{ position: 'sticky', top: 56, zIndex: 10, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center', background: 'var(--card-bg,#fff)', borderBottom: '1px solid var(--border,#e5e7eb)', padding: '10px 12px' }}>
            <button onClick={() => router.back()} aria-label="Back" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', background: 'var(--card-bg,#fff)', cursor: 'pointer' }}>
              <FaArrowLeft />
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <SafeImage
                src={peer?.photoURL || (chat?.type === 'group' ? '/images/default-group.png' : '/images/default-avatar.png')}
                alt={peer?.displayName || 'Chat'}
                width={36}
                height={36}
                style={{ borderRadius: 999 }}
              />
              <div>
                <h3 style={{ margin: 0 }}>{peer?.displayName || chat?.name || 'Chat'}</h3>
                {peer?.isTyping && <span style={{ fontSize: 12, color: '#667eea', fontStyle: 'italic' }}>typing...</span>}
              </div>
            </div>
            <div />
          </header>

          <main style={{ display: 'grid', gap: 8, padding: 12, minHeight: 'calc(100vh - 200px)' }}>
            {messages.map((m) => {
              const mine = m.senderId === user?.uid;
              return (
                <div key={m.id} style={{ maxWidth: '76%', padding: '10px 12px', borderRadius: 14, display: 'inline-grid', gap: 6, border: '1px solid var(--border,#e5e7eb)', background: mine ? '#eef2ff' : 'var(--card-bg,#fff)', justifySelf: mine ? 'end' : 'start' }}>
                  {m.imageUrl && <SafeImage src={m.imageUrl} alt="Image" width={240} height={180} style={{ borderRadius: 8 }} />}
                  {m.fileUrl && (
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                      📎 {m.fileName || 'File'}
                    </a>
                  )}
                  {m.text && <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</p>}
                  <span style={{ fontSize: 11, opacity: 0.7, justifySelf: 'end' }}>
                    {m.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </main>

          <footer style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '8px 10px calc(10px + env(safe-area-inset-bottom))', background: 'color-mix(in srgb, var(--bg,#0b0c10) 88%, transparent)', borderTop: '1px solid var(--border,#e5e7eb)', backdropFilter: 'blur(12px) saturate(150%)', display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 8, alignItems: 'center' }}>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
            <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />

            <button onClick={() => imageInputRef.current?.click()} disabled={uploading} aria-label="Upload image" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'rgba(102,126,234,.12)', color: '#667eea', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaImage />}
            </button>

            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Upload file" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'rgba(102,126,234,.12)', color: '#667eea', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <FaPaperclip />
            </button>

            <input
              placeholder="Message..."
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              style={{ height: 44, borderRadius: 12, border: '1px solid var(--border,#e5e7eb)', background: 'var(--card-bg,#fff)', padding: '0 12px', outline: 'none' }}
            />

            <button onClick={() => send()} aria-label="Send" style={{ width: 56, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }}>
              <FaPaperPlane />
            </button>
          </footer>
        </div>
      </Layout>
    </AuthGuard>
  );
}
