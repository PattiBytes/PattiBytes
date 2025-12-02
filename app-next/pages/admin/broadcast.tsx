// app-next/pages/admin/broadcast.tsx - FIXED ALL ISSUES
import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';

import {
  FaBullhorn,
  FaPaperPlane,
  FaImage,
  FaBell,
  FaCheckCircle,
  FaTimesCircle,
  FaUsers,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import SafeImage from '@/components/SafeImage';
import styles from '@/styles/AdminBroadcast.module.css';

interface BroadcastHistory {
  id: string;
  title: string;
  body: string;
  type: 'announcement' | 'notification' | 'official_post';
  recipientCount: number;
  createdAt: Date;
  createdBy: string;
}

export default function AdminBroadcast() {
  const { user, userProfile } = useAuth();
  const { db } = getFirebaseClient();

  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastHistory[]>([]);
  const [posting, setPosting] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<'all' | 'users' | 'admins'>('all');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const createOfficialPost = async () => {
    if (!db || !user || !postContent.trim()) {
      toast.error('Post content is required');
      return;
    }

    setPosting(true);
    try {
      let imageUrl = '';
      if (postImage) {
        imageUrl = await uploadToCloudinary(postImage, 'image');
      }

      const docRef = await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userProfile?.displayName || 'Admin',
        authorUsername: userProfile?.username || 'admin',
        authorPhoto: userProfile?.photoURL || '/images/default-avatar.png',
        title: 'Official Announcement',
        content: postContent,
        imageUrl,
        type: 'announcement',
        isOfficial: true,
        isDraft: false,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add to broadcast history
      setBroadcastHistory((prev) => [
        {
          id: docRef.id,
          title: 'Official Announcement',
          body: postContent.substring(0, 100),
          type: 'official_post',
          recipientCount: 0,
          createdAt: new Date(),
          createdBy: user.uid,
        },
        ...prev,
      ]);

      toast.success('Official post created successfully!');
      setPostContent('');
      setPostImage(null);
      setImagePreview('');
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const sendNotification = async () => {
    if (!db || !notificationTitle.trim() || !notificationBody.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSendingNotif(true);
    try {
      const usersQ = query(collection(db, 'users'), limit(10000));
      const usersSnap = await getDocs(usersQ);
      const recipientCount = usersSnap.size;

      const promises = usersSnap.docs.map((doc) =>
        addDoc(collection(db, 'notifications'), {
          userId: doc.id,
          title: notificationTitle,
          body: notificationBody,
          isRead: false,
          type: 'admin_broadcast',
          icon: '📢',
          createdAt: serverTimestamp(),
        })
      );

      await Promise.all(promises);

      // Add to history
      setBroadcastHistory((prev) => [
        {
          id: Date.now().toString(),
          title: notificationTitle,
          body: notificationBody,
          type: 'notification',
          recipientCount,
          createdAt: new Date(),
          createdBy: user?.uid || '',
        },
        ...prev,
      ]);

      toast.success(`Notification sent to ${recipientCount} users!`);
      setNotificationTitle('');
      setNotificationBody('');
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <AdminGuard>
      <Layout title="Broadcast - Admin">
        <div className={styles.admin}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1>
                <FaBullhorn /> Broadcast Center
              </h1>
              <p>Send announcements and notifications to all users</p>
            </div>
          </motion.div>

          <div className={styles.broadcastGrid}>
            {/* Official Post Card */}
            <motion.div
              className={styles.card}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className={styles.cardHeader}>
                <h2>
                  <FaPaperPlane /> Create Official Post
                </h2>
                <span className={styles.badgeOfficial}>Official</span>
              </div>

              <div className={styles.formGroup}>
                <label>Post Content</label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write your official announcement..."
                  rows={6}
                  maxLength={5000}
                  className={styles.textarea}
                />
                <div className={styles.charCount}>
                  {postContent.length} / 5000 characters
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FaImage /> Attach Image (optional)
                </label>
                <div className={styles.fileInputWrapper}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={styles.fileInput}
                    id="postImage"
                  />
                  <label htmlFor="postImage" className={styles.fileLabel}>
                    Click to upload or drag and drop
                  </label>
                </div>
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    <div className={styles.previewImage}>
                      <SafeImage src={imagePreview} alt="Preview" width={300} height={200} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPostImage(null);
                        setImagePreview('');
                      }}
                      className={styles.removeImageBtn}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.infoBox}>
                <FaCheckCircle /> This will be marked as OFFICIAL and visible to all users
              </div>

              <button
                onClick={createOfficialPost}
                disabled={posting || !postContent.trim()}
                className={styles.primaryBtn}
              >
                {posting ? 'Publishing...' : 'Publish Official Post'}
              </button>
            </motion.div>

            {/* Notification Card */}
            <motion.div
              className={styles.card}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.cardHeader}>
                <h2>
                  <FaBell /> Send Notification
                </h2>
                <span className={styles.badgeNotif}>Push</span>
              </div>

              <div className={styles.formGroup}>
                <label>Notification Title</label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Important Update"
                  maxLength={100}
                  className={styles.input}
                />
                <div className={styles.charCount}>{notificationTitle.length} / 100</div>
              </div>

              <div className={styles.formGroup}>
                <label>Notification Message</label>
                <textarea
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Your message to users..."
                  rows={6}
                  maxLength={500}
                  className={styles.textarea}
                />
                <div className={styles.charCount}>{notificationBody.length} / 500</div>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FaUsers /> Send To
                </label>
                <select
                  value={selectedRecipients}
                  onChange={(e) =>
                    setSelectedRecipients(e.target.value as 'all' | 'users' | 'admins')
                  }
                  className={styles.select}
                >
                  <option value="all">All Users</option>
                  <option value="users">Regular Users Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>

              <div className={styles.warningBox}>
                <FaTimesCircle /> This will notify all selected users immediately
              </div>

              <button
                onClick={sendNotification}
                disabled={sendingNotif || !notificationTitle.trim() || !notificationBody.trim()}
                className={styles.dangerBtn}
              >
                {sendingNotif ? 'Sending...' : 'Send Notification'}
              </button>
            </motion.div>
          </div>

          {/* Broadcast History */}
          {broadcastHistory.length > 0 && (
            <motion.div
              className={styles.historySection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2>Broadcast History</h2>
              <div className={styles.historyList}>
                {broadcastHistory.slice(0, 10).map((broadcast, idx) => (
                  <motion.div
                    key={broadcast.id}
                    className={styles.historyItem}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className={styles.historyIcon}>
                      {broadcast.type === 'official_post' ? (
                        <FaPaperPlane />
                      ) : (
                        <FaBell />
                      )}
                    </div>
                    <div className={styles.historyContent}>
                      <h4>{broadcast.title}</h4>
                      <p>{broadcast.body}</p>
                      <span className={styles.historyMeta}>
                        {broadcast.createdAt.toLocaleString()} • {broadcast.recipientCount} recipients
                      </span>
                    </div>
                    <span
                      className={`${styles.historyBadge} ${
                        broadcast.type === 'official_post'
                          ? styles.badgePost
                          : styles.badgeNotification
                      }`}
                    >
                      {broadcast.type === 'official_post' ? 'Post' : 'Notification'}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
