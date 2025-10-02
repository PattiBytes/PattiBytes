import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FaPaperPlane, FaImage, FaSmile } from 'react-icons/fa';
import Image from 'next/image';
import styles from '@/styles/Community.module.css';

interface Message {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  photo_url?: string;
  message: string;
  image_url?: string;
  created_at: string;
}

export default function Community() {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('community_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          // Auto scroll to bottom
          setTimeout(() => {
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 100);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userProfile) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('community_messages')
        .insert({
          user_id: user.uid,
          username: userProfile.username,
          display_name: userProfile.displayName,
          photo_url: userProfile.photoURL,
          message: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title="Community - PattiBytes">
      <div className={styles.community}>
        <div className={styles.chatHeader}>
          <h1>PattiBytes Community</h1>
          <p>{messages.length} messages</p>
        </div>

        <div className={styles.chatContainer} id="chat-container">
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.empty}>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className={styles.messages}>
              {messages.map((message, index) => {
                const isOwnMessage = message.user_id === user?.uid;
                const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;

                return (
                  <motion.div
                    key={message.id}
                    className={`${styles.message} ${isOwnMessage ? styles.ownMessage : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {!isOwnMessage && showAvatar && (
                      <div className={styles.avatar}>
                        {message.photo_url ? (
                          <Image
                            src={message.photo_url}
                            alt={message.display_name}
                            width={36}
                            height={36}
                            className={styles.avatarImage}
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {message.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={styles.messageContent}>
                      {!isOwnMessage && showAvatar && (
                        <div className={styles.messageMeta}>
                          <span className={styles.displayName}>{message.display_name}</span>
                          <span className={styles.username}>@{message.username}</span>
                        </div>
                      )}

                      <div className={styles.messageBubble}>
                        {message.image_url && (
                          <Image
                            src={message.image_url}
                            alt="Shared image"
                            width={300}
                            height={200}
                            className={styles.messageImage}
                          />
                        )}
                        <p>{message.message}</p>
                      </div>

                      <span className={styles.messageTime}>
                        {new Date(message.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <form className={styles.inputArea} onSubmit={handleSendMessage}>
          <button type="button" className={styles.iconButton}>
            <FaImage />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className={styles.messageInput}
          />

          <button type="button" className={styles.iconButton}>
            <FaSmile />
          </button>

          <button 
            type="submit" 
            className={styles.sendButton}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <div className={styles.spinner} />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
