// app-next/pages/community/[id].tsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import SafeImage from '@/components/SafeImage';
import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
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
import {
  FaArrowLeft,
  FaPaperPlane,
  FaImage,
  FaPaperclip,
  FaSpinner,
  FaUsers,
  FaSignOutAlt,
  FaEdit,
  FaTrash,
  FaCheckSquare,
  FaSquare,
} from 'react-icons/fa';

interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: Date | null;
}

interface ParticipantProfile {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
}

type DeleteScope = 'me' | 'everyone';

export default function CommunityChat() {
  const router = useRouter();
  const chatId = useMemo(
    () => (typeof router.query.id === 'string' ? router.query.id : ''),
    [router.query.id],
  );

  const { user, isAdmin } = useAuth();
  const { db } = getFirebaseClient();

  const [chat, setChat] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenForMe, setHiddenForMe] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [typingOthers, setTypingOthers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);

  // Selection / deletion UI
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmScope, setConfirmScope] = useState<DeleteScope>('me');
  const [confirmTargets, setConfirmTargets] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTargetId = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);

  // ----- hydrate "delete for me only" ids from localStorage -----
  useEffect(() => {
    if (!user?.uid || !chatId) return;
    const key = `pb_chat_hidden_${chatId}_${user.uid}`;
    try {
      const raw =
        typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        setHiddenForMe(new Set(arr));
      }
    } catch {
      // ignore parse errors
    }
  }, [chatId, user?.uid]);

  const persistHidden = (next: Set<string>) => {
    if (!user?.uid || !chatId || typeof window === 'undefined') return;
    const key = `pb_chat_hidden_${chatId}_${user.uid}`;
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(next)));
    } catch {
      // ignore quota errors
    }
  };

  // ----- Load chat doc & participants -----
  useEffect(() => {
    if (!db || !user || !chatId) return;

    const unsub = onSnapshot(doc(db, 'chats', chatId), async (snap) => {
      if (!snap.exists()) {
        router.replace('/community');
        return;
      }

      const data = snap.data();
      const partUids: string[] = Array.isArray(data.participants)
        ? (data.participants as string[])
        : [];

      // Guard: user must be a participant
      if (!partUids.includes(user.uid)) {
        router.replace('/community');
        return;
      }

      setChat(data);

      // Typing flags
      const typing = partUids.filter(
        (uid) => uid !== user.uid && data[`typing_${uid}`],
      );
      setTypingOthers(typing);

      // Mark this chat as read for current user
      const unreadField = `unread_${user.uid}`;
      if (typeof data[unreadField] === 'number' && data[unreadField] > 0) {
        updateDoc(doc(db, 'chats', chatId), { [unreadField]: 0 }).catch(
          () => {},
        );
      }

      // Hydrate participant profiles
      try {
        const loaded: ParticipantProfile[] = await Promise.all(
          partUids.map(async (uid) => {
            const uref = doc(db, 'users', uid);
            const usnap = await getDoc(uref);
            if (!usnap.exists()) {
              return {
                uid,
                displayName: 'User',
                username: undefined,
                photoURL: '/images/default-avatar.png',
              };
            }
            const udata = usnap.data() as DocumentData;
            return {
              uid,
              displayName: udata.displayName || 'User',
              username: udata.username || undefined,
              photoURL: udata.photoURL || '/images/default-avatar.png',
            };
          }),
        );
        setParticipants(loaded);
      } catch {
        // ignore errors
      }
    });

    return () => unsub();
  }, [db, user, chatId, router]);

  // ----- Messages stream (bounded + ordered) -----
  useEffect(() => {
    if (!db || !user || !chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(200),
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = snap.docs.map((d) => {
        const m = d.data() as DocumentData;
        const raw = m.createdAt;
        let created: Date | null = null;
        if (raw && typeof raw.toDate === 'function') {
          created = (raw as Timestamp).toDate();
        } else if (raw instanceof Date) {
          created = raw;
        }
        return {
          id: d.id,
          senderId: m.senderId || '',
          text: m.text || '',
          imageUrl: m.imageUrl,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          createdAt: created,
        };
      });
      setMessages(list);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    });

    return () => unsub();
  }, [db, user, chatId]);

  // ----- Derived chat info -----
  const isGroup = chat?.type === 'group';
  const myUid = user?.uid;

  const me = participants.find((p) => p.uid === myUid);
  const others = participants.filter((p) => p.uid !== myUid);

  const ownerId: string | undefined =
    (chat?.ownerId as string | undefined) || participants[0]?.uid;
  const isOwner = !!myUid && !!ownerId && myUid === ownerId;

  const headerTitle = isGroup
    ? chat?.name || 'Group Chat'
    : others[0]?.displayName || 'Chat';

  const headerPhoto =
    (isGroup ? chat?.photoURL : others[0]?.photoURL) ||
    (isGroup ? '/images/default-group.png' : '/images/default-avatar.png');

  const createdAtDate =
    chat?.createdAt && typeof chat.createdAt.toDate === 'function'
      ? (chat.createdAt as Timestamp).toDate()
      : null;

  const typingLabel = useMemo(() => {
    if (!typingOthers.length) return '';
    if (typingOthers.length === 1) {
      const p = participants.find((x) => x.uid === typingOthers[0]);
      return p ? `${p.displayName} is typing…` : 'typing…';
    }
    return 'Several people are typing…';
  }, [typingOthers, participants]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenForMe.has(m.id)),
    [messages, hiddenForMe],
  );

  // ----- Typing indicator -----
  const setTyping = (value: boolean) => {
    if (!db || !user || !chatId) return;
    const key = `typing_${user.uid}`;
    updateDoc(doc(db, 'chats', chatId), { [key]: value }).catch(() => {});
  };

  const handleInputChange = (v: string) => {
    setInput(v);
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1200);
  };

  // ----- Send message -----
  const send = async (
    extra?: { imageUrl?: string; fileUrl?: string; fileName?: string },
  ) => {
    if (!db || !user || !chatId) return;
    const text = input.trim();
    if (!text && !extra?.imageUrl && !extra?.fileUrl) return;

    setInput('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text,
        imageUrl: extra?.imageUrl || null,
        fileUrl: extra?.fileUrl || null,
        fileName: extra?.fileName || null,
        createdAt: serverTimestamp(),
      });

      const partUids: string[] = Array.isArray(chat?.participants)
        ? (chat!.participants as string[])
        : [];

      const updates: Record<string, unknown> = {
        lastMessage:
          text ||
          (extra?.imageUrl ? '📷 Image' : extra?.fileUrl ? '📎 File' : ''),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      partUids.forEach((uid) => {
        if (uid !== user.uid) {
          const key = `unread_${uid}`;
          updates[key] = (chat?.[key] || 0) + 1;
        }
      });

      await updateDoc(doc(db, 'chats', chatId), updates);
      setTyping(false);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    } catch (e) {
      console.error('send error', e);
    }
  };

  // ----- Image upload -----
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isCloudinaryConfigured()) {
      alert('Image upload not configured');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'image');
      await send({ imageUrl: url });
    } catch (err) {
      console.error(err);
      alert('Image upload failed');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // ----- File upload -----
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isCloudinaryConfigured()) {
      alert('File upload not configured');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'image');
      await send({ fileUrl: url, fileName: file.name });
    } catch (err) {
      console.error(err);
      alert('File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ----- Change group photo (owner only) -----
  const handleGroupPhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !chatId || !isOwner) return;
    if (!isCloudinaryConfigured()) {
      alert('Upload not configured');
      return;
    }
    setChangingPhoto(true);
    try {
      const url = await uploadToCloudinary(file, 'avatar');
      await updateDoc(doc(db, 'chats', chatId), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update group photo');
    } finally {
      setChangingPhoto(false);
      if (groupPhotoInputRef.current) groupPhotoInputRef.current.value = '';
    }
  };

  // ----- Rename group (owner only) -----
  const startEditingName = () => {
    if (!isGroup) return;
    setGroupNameDraft(chat?.name || '');
    setEditingName(true);
  };

  const saveGroupName = async () => {
    if (!db || !chatId || !isOwner) return;
    const name = groupNameDraft.trim();
    if (!name) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        name,
        updatedAt: serverTimestamp(),
      });
      setEditingName(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  // ----- Leave group -----
  const doLeaveGroup = async () => {
    if (!db || !user || !chatId) return;
    if (!isGroup) return;
    if (
      !window.confirm(
        'Leave this group? You will stop receiving messages from it.',
      )
    ) {
      return;
    }
    setLeaving(true);
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        participants: arrayRemove(user.uid),
        [`typing_${user.uid}`]: false,
        [`unread_${user.uid}`]: 0,
      });
      router.replace('/community');
    } catch (err) {
      console.error('leave group error', err);
      alert('Failed to leave group');
    } finally {
      setLeaving(false);
    }
  };

  // ----- Delete message for me (local only) -----
  const deleteForMe = (ids: string[]) => {
    setHiddenForMe((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      persistHidden(next);
      return next;
    });
  };

  // ----- Delete message for everyone (sender or admin only) -----
  const deleteForEveryone = async (ids: string[]) => {
    if (!db || !user || !chatId) return;
    const tasks: Promise<unknown>[] = [];
    for (const id of ids) {
      const msg = messages.find((m) => m.id === id);
      if (!msg) continue;
      if (!(msg.senderId === user.uid || isAdmin)) continue;
      tasks.push(deleteDoc(doc(db, 'chats', chatId, 'messages', id)));
    }
    try {
      await Promise.all(tasks);
    } catch (err) {
      console.error(err);
      alert('Failed to delete some messages');
    }
  };

  // ----- Selection & actions -----
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) {
        // exit selection mode if nothing selected
        setSelectionMode(false);
      }
      return next;
    });
  };

  const openActionModalForMessage = (id: string) => {
    setActionMessageId(id);
    setActionModalOpen(true);
  };

  const handleBubblePointerDown = (
    id: string,
    e: PointerEvent<HTMLDivElement>,
  ) => {
    if (e.pointerType === 'mouse') return;
    longPressTargetId.current = id;
    longPressTimer.current = setTimeout(() => {
      openActionModalForMessage(id);
    }, 500);
  };

  const cancelLongPress = () => {
    longPressTargetId.current = null;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleBubblePointerUp = () => {
    cancelLongPress();
  };

  const handleBubbleContextMenu = (
    id: string,
    e: MouseEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    openActionModalForMessage(id);
  };

  const openConfirm = (scope: DeleteScope, ids: string[]) => {
    setConfirmScope(scope);
    setConfirmTargets(ids);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    const ids = confirmTargets;
    if (!ids.length) {
      setConfirmOpen(false);
      return;
    }
    if (confirmScope === 'me') {
      deleteForMe(ids);
    } else {
      await deleteForEveryone(ids);
    }
    setConfirmOpen(false);
    clearSelection();
    setActionModalOpen(false);
  };

  const handleBack = () => router.back();

  const loading = !chat;

  if (!user) return null;

  const selectedCount = selectedIds.size;
  const anySelected = selectedCount > 0;
  const canDeleteSelectedForEveryone = Array.from(selectedIds).some((id) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return false;
    return msg.senderId === user.uid || isAdmin;
  });

  return (
    <AuthGuard>
      <Layout title={`${headerTitle || 'Chat'} - PattiBytes`}>
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: '0 0 calc(70px + env(safe-area-inset-bottom))',
            display: 'grid',
            gridTemplateRows: 'auto auto 1fr auto',
            minHeight: '100vh',
          }}
        >
          {/* Dedicated chat header (global header hidden for this route via Header.tsx) */}
          <header
            style={{
              position: 'sticky',
              top: 'calc(var(--safe-area-top))',
              zIndex: 30,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 10,
              alignItems: 'center',
              background: 'var(--card-bg, #fff)',
              borderBottom: '1px solid var(--border, #e5e7eb)',
              padding:
                '10px max(12px, env(safe-area-inset-left)) 10px max(12px, env(safe-area-inset-right))',
            }}
          >
            <button
              onClick={handleBack}
              aria-label="Back"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--card-bg, #fff)',
                display: 'inline-grid',
                placeItems: 'center',
              }}
            >
              <FaArrowLeft />
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                border: 'none',
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                minWidth: 0,
              }}
            >
              <SafeImage
                src={headerPhoto}
                alt={headerTitle || 'Chat'}
                width={36}
                height={36}
                style={{ borderRadius: 999, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {headerTitle || 'Chat'}
                </h3>
                {typingLabel ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#667eea',
                      fontStyle: 'italic',
                    }}
                  >
                    {typingLabel}
                  </span>
                ) : isGroup && others.length ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary, #6b7280)',
                    }}
                  >
                    {participants.length} members
                  </span>
                ) : null}
              </div>
            </button>

            <div />
          </header>

          {/* Selection toolbar */}
          {selectionMode && (
            <div
              style={{
                position: 'sticky',
                top: 'calc(var(--safe-area-top) + 56px)',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding:
                  '6px max(12px, env(safe-area-inset-left)) 6px max(12px, env(safe-area-inset-right))',
                background: 'rgba(15,23,42,0.04)',
                borderBottom: '1px solid var(--border, #e5e7eb)',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <FaCheckSquare />
                <span>{selectedCount} selected</span>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => openConfirm('me', Array.from(selectedIds))}
                  disabled={!anySelected}
                  style={{
                    borderRadius: 999,
                    border: '1px solid var(--border,#e5e7eb)',
                    background: 'transparent',
                    padding: '4px 10px',
                  }}
                >
                  Delete for me
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openConfirm('everyone', Array.from(selectedIds))
                  }
                  disabled={!canDeleteSelectedForEveryone}
                  style={{
                    borderRadius: 999,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    padding: '4px 10px',
                  }}
                >
                  Delete for all
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '4px 6px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* MESSAGES */}
          <main
            style={{
              display: 'grid',
              gap: 8,
              padding:
                '12px max(12px, env(safe-area-inset-left)) 12px max(12px, env(safe-area-inset-right))',
              overflowY: 'auto',
              alignContent: 'start',
            }}
          >
            {loading ? (
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: '40vh',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                  }}
                  className="spinner"
                />
              </div>
            ) : (
              visibleMessages.map((m) => {
                const mine = m.senderId === user.uid;
                const sender =
                  participants.find((p) => p.uid === m.senderId) || null;
                const timeLabel =
                  m.createdAt instanceof Date
                    ? m.createdAt.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                const selected = selectedIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    onPointerDown={(e) => handleBubblePointerDown(m.id, e)}
                    onPointerUp={handleBubblePointerUp}
                    onPointerCancel={cancelLongPress}
                    onContextMenu={(e) =>
                      handleBubbleContextMenu(m.id, e)
                    }
                    onClick={() =>
                      selectionMode && toggleSelect(m.id)
                    }
                    style={{
                      maxWidth: '80%',
                      padding: '8px 10px',
                      borderRadius: 14,
                      border: selected
                        ? '2px solid #667eea'
                        : '1px solid var(--border, #e5e7eb)',
                      background: mine
                        ? selected
                          ? '#e0e7ff'
                          : '#eef2ff'
                        : selected
                        ? 'rgba(59,130,246,0.08)'
                        : 'var(--card-bg, #fff)',
                      display: 'inline-grid',
                      gap: 4,
                      justifySelf: mine ? 'end' : 'start',
                      wordBreak: 'break-word',
                      position: 'relative',
                    }}
                  >
                    {selectionMode && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: mine ? undefined : -24,
                          right: mine ? -24 : undefined,
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        {selected ? <FaCheckSquare /> : <FaSquare />}
                      </div>
                    )}

                    {isGroup && !mine && sender && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-secondary, #6b7280)',
                        }}
                      >
                        <SafeImage
                          src={sender.photoURL || '/images/default-avatar.png'}
                          alt={sender.displayName}
                          width={18}
                          height={18}
                          style={{ borderRadius: 999 }}
                        />
                        <span>{sender.displayName}</span>
                      </div>
                    )}

                    {m.imageUrl && (
                      <SafeImage
                        src={m.imageUrl}
                        alt="Image"
                        width={260}
                        height={200}
                        style={{ borderRadius: 8 }}
                      />
                    )}

                    {m.fileUrl && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#3b82f6',
                          textDecoration: 'underline',
                          fontSize: 14,
                        }}
                      >
                        📎 {m.fileName || 'File'}
                      </a>
                    )}

                    {m.text && (
                      <p
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          fontSize: 14,
                        }}
                      >
                        {m.text}
                      </p>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.7,
                        }}
                      >
                        {timeLabel}
                      </span>

                      {!selectionMode && (
                        <button
                          type="button"
                          onClick={() =>
                            openActionModalForMessage(m.id)
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            fontSize: 11,
                            color: '#6b7280',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FaTrash /> Options
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </main>

          {/* Composer */}
          <footer
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              padding:
                '8px max(12px, env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-right))',
              background:
                'color-mix(in srgb, var(--bg, #0b0c10) 88%, transparent)',
              borderTop: '1px solid var(--border, #e5e7eb)',
              backdropFilter: 'blur(12px) saturate(150%)',
              display: 'grid',
              gridTemplateColumns: 'auto auto 1fr auto',
              gap: 8,
              alignItems: 'center',
              zIndex: 20,
            }}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading || loading}
              aria-label="Upload image"
              style={{
                width: 40,
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(102,126,234,.12)',
                color: '#667eea',
                cursor: uploading || loading ? 'not-allowed' : 'pointer',
                display: 'inline-grid',
                placeItems: 'center',
              }}
            >
              {uploading ? (
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FaImage />
              )}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              aria-label="Upload file"
              style={{
                width: 40,
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(102,126,234,.12)',
                color: '#667eea',
                cursor: uploading || loading ? 'not-allowed' : 'pointer',
                display: 'inline-grid',
                placeItems: 'center',
              }}
            >
              <FaPaperclip />
            </button>

            <input
              placeholder={loading ? 'Loading chat…' : 'Message…'}
              value={input}
              onChange={(e) => !loading && handleInputChange(e.target.value)}
              onKeyDown={
                loading
                  ? undefined
                  : (e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void send();
                      }
                    }
              }
              disabled={loading}
              style={{
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--border, #e5e7eb)',
                background: 'var(--card-bg, #fff)',
                padding: '0 12px',
                outline: 'none',
                fontSize: 15,
              }}
            />

            <button
              type="button"
              onClick={() => !loading && void send()}
              aria-label="Send"
              disabled={loading}
              style={{
                width: 56,
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: loading
                  ? 'rgba(148,163,184,0.6)'
                  : 'linear-gradient(135deg,#667eea,#764ba2)',
                color: '#fff',
                display: 'inline-grid',
                placeItems: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <FaPaperPlane />
            </button>
          </footer>

          {/* Action modal for single message (opened via long press / right click / Options) */}
          {actionModalOpen && actionMessageId && (
            <div
              onClick={() => setActionModalOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 50,
                display: 'grid',
                placeItems: 'end center',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: 480,
                  background: 'var(--card-bg,#fff)',
                  borderRadius: '16px 16px 0 0',
                  padding: 16,
                  boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    background: 'var(--border,#e5e7eb)',
                    justifySelf: 'center',
                    marginBottom: 4,
                  }}
                />
                <h3 style={{ margin: 0, fontSize: 15 }}>Message options</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--text-secondary,#6b7280)',
                  }}
                >
                  Choose what to do with this message.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    openConfirm('me', [actionMessageId])
                  }
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border,#e5e7eb)',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FaTrash />
                  <span>Delete for me only</span>
                </button>

                {(messages.find((m) => m.id === actionMessageId)
                  ?.senderId === user.uid ||
                  isAdmin) && (
                  <button
                    type="button"
                    onClick={() =>
                      openConfirm('everyone', [actionMessageId])
                    }
                    style={{
                      borderRadius: 10,
                      border: '1px solid #fecaca',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <FaTrash />
                    <span>Delete for everyone</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(true);
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      next.add(actionMessageId);
                      return next;
                    });
                    setActionModalOpen(false);
                  }}
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border,#e5e7eb)',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <FaCheckSquare />
                  <span>Select multiple</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  style={{
                    marginTop: 4,
                    borderRadius: 10,
                    border: 'none',
                    padding: '10px 12px',
                    background: 'transparent',
                    color: 'var(--text-secondary,#6b7280)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Confirmation dialog for delete (single or multiple) */}
          {confirmOpen && (
            <div
              onClick={() => setConfirmOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 60,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: 420,
                  background: 'var(--card-bg,#fff)',
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
                  display: 'grid',
                  gap: 12,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FaTrash />
                  Confirm delete
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'var(--text-secondary,#6b7280)',
                  }}
                >
                  {confirmScope === 'me'
                    ? 'This will hide the selected message(s) only for you.'
                    : 'This will permanently delete the selected message(s) for everyone.'}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--text-secondary,#6b7280)',
                  }}
                >
                  Are you sure you want to continue?
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    style={{
                      borderRadius: 999,
                      border: '1px solid var(--border,#e5e7eb)',
                      background: 'transparent',
                      padding: '6px 12px',
                      fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    style={{
                      borderRadius: 999,
                      border: 'none',
                      background:
                        confirmScope === 'me'
                          ? 'linear-gradient(135deg,#64748b,#0f172a)'
                          : 'linear-gradient(135deg,#ef4444,#b91c1c)',
                      color: '#fff',
                      padding: '6px 14px',
                      fontSize: 13,
                    }}
                  >
                    {confirmScope === 'me'
                      ? 'Delete for me'
                      : 'Delete for everyone'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Details / members sheet */}
          {showDetails && (
            <div
              onClick={() => setShowDetails(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 40,
                display: 'grid',
                placeItems: 'end center',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: 800,
                  maxHeight: '72vh',
                  background: 'var(--card-bg, #fff)',
                  borderRadius: '16px 16px 0 0',
                  padding: '12px 16px 16px',
                  boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
                  display: 'grid',
                  gap: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 999,
                    background: 'var(--border, #e5e7eb)',
                    justifySelf: 'center',
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <SafeImage
                      src={headerPhoto}
                      alt={headerTitle || 'Chat'}
                      width={44}
                      height={44}
                      style={{ borderRadius: 999 }}
                    />
                    <div>
                      {isOwner && isGroup && editingName ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          <input
                            value={groupNameDraft}
                            onChange={(e) => setGroupNameDraft(e.target.value)}
                            style={{
                              borderRadius: 8,
                              border:
                                '1px solid var(--border, #e5e7eb)',
                              padding: '4px 8px',
                              fontSize: 14,
                            }}
                          />
                          <button
                            type="button"
                            onClick={saveGroupName}
                            disabled={savingName}
                            style={{
                              borderRadius: 8,
                              border: 'none',
                              padding: '4px 8px',
                              background:
                                'linear-gradient(135deg,#667eea,#764ba2)',
                              color: '#fff',
                              fontSize: 12,
                            }}
                          >
                            {savingName ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 16,
                            }}
                          >
                            {headerTitle || 'Chat'}
                          </h3>
                          {isOwner && isGroup && (
                            <button
                              type="button"
                              onClick={startEditingName}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary,#6b7280)',
                              }}
                              aria-label="Edit name"
                            >
                              <FaEdit size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-secondary, #6b7280)',
                        }}
                      >
                        {participants.length}{' '}
                        {isGroup ? 'members' : 'participants'}
                        {isOwner && isGroup ? ' · You created this group' : ''}
                        {!isOwner && isGroup && ownerId
                          ? ` · Created by ${
                              participants.find((p) => p.uid === ownerId)
                                ?.displayName || 'User'
                            }`
                          : ''}
                      </div>
                      {createdAtDate && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary, #6b7280)',
                          }}
                        >
                          Created{' '}
                          {createdAtDate.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: 8,
                      justifyItems: 'end',
                    }}
                  >
                    {isOwner && isGroup && (
                      <>
                        <input
                          ref={groupPhotoInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleGroupPhotoChange}
                        />
                        <button
                          type="button"
                          onClick={() => groupPhotoInputRef.current?.click()}
                          disabled={changingPhoto}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 999,
                            border:
                              '1px solid var(--border,#e5e7eb)',
                            background: 'transparent',
                            fontSize: 12,
                          }}
                        >
                          <FaImage />
                          {changingPhoto ? 'Updating…' : 'Change photo'}
                        </button>
                      </>
                    )}
                    {isGroup && (
                      <button
                        type="button"
                        onClick={doLeaveGroup}
                        disabled={leaving}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#b91c1c',
                          fontSize: 12,
                        }}
                      >
                        <FaSignOutAlt />
                        {leaving ? 'Leaving…' : 'Leave'}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border, #e5e7eb)',
                    marginTop: 4,
                    paddingTop: 8,
                    overflowY: 'auto',
                  }}
                >
                  {participants.map((p) => {
                    const isMe = p.uid === myUid;
                    return (
                      <div
                        key={p.uid}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '8px 4px',
                        }}
                      >
                        <SafeImage
                          src={p.photoURL || '/images/default-avatar.png'}
                          alt={p.displayName}
                          width={36}
                          height={36}
                          style={{ borderRadius: 999 }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            {p.displayName}
                            {isMe && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  color: '#10b981',
                                }}
                              >
                                (you)
                              </span>
                            )}
                            {isOwner && p.uid === ownerId && !isMe && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 11,
                                  color: '#a855f7',
                                }}
                              >
                                (owner)
                              </span>
                            )}
                          </div>
                          {p.username && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary, #6b7280)',
                              }}
                            >
                              @{p.username}
                            </div>
                          )}
                        </div>
                        {p.username && (
                          <button
                            type="button"
                            onClick={() => {
                              router.push(`/user/${p.username}`);
                              setShowDetails(false);
                            }}
                            style={{
                              fontSize: 12,
                              padding: '6px 10px',
                              borderRadius: 999,
                              border:
                                '1px solid var(--border, #e5e7eb)',
                              background: 'transparent',
                            }}
                          >
                            View
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
