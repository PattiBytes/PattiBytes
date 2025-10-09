import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { FaBullhorn, FaPaperPlane, FaImage, FaBell } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import SafeImage from '@/components/SafeImage';
import styles from '@/styles/AdminEnhanced.module.css';

export default function AdminBroadcast() {
  const { user, userProfile } = useAuth();
  const { db } = getFirebaseClient();

  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);

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
        imageUrl = await uploadToCloudinary(postImage);
      }

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userProfile?.displayName || 'Admin',
        authorUsername: userProfile?.username || 'admin',
        authorPhoto: userProfile?.photoURL || '/images/default-avatar.png',
        content: postContent,
        imageUrl,
        isOfficial: true,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: serverTimestamp(),
      });

      toast.success('Official post created!');
      setPostContent('');
      setPostImage(null);
      setImagePreview('');
    } catch (e) {
      console.error('Failed to create post:', e);
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
      const usersSnap = await getDocs(collection(db, 'users'));

      const promises = usersSnap.docs.map((doc) =>
        addDoc(collection(db, 'notifications'), {
          userId: doc.id,
          title: notificationTitle,
          body: notificationBody,
          isRead: false,
          type: 'admin_broadcast',
          createdAt: serverTimestamp(),
        })
      );

      await Promise.all(promises);
      toast.success(`Notification sent to ${usersSnap.size} users!`);
      setNotificationTitle('');
      setNotificationBody('');
    } catch (e) {
      console.error('Failed to send notification:', e);
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
                <FaBullhorn /> Broadcast
              </h1>
              <p>Create official posts and send notifications to all users</p>
            </div>
          </motion.div>

          <div className={styles.broadcastGrid}>
            <motion.div
              className={styles.broadcastCard}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2>
                <FaPaperPlane /> Create Official Post
              </h2>
              <div className={styles.formGroup}>
                <label>Post Content</label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Write your official announcement..."
                  rows={6}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FaImage /> Attach Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    <SafeImage src={imagePreview} alt="Preview" width={400} height={300} />
                  </div>
                )}
              </div>

              <div className={styles.officialBadge}>
                <FaBullhorn /> This will be marked as OFFICIAL
              </div>

              <button onClick={createOfficialPost} disabled={posting} className={styles.primaryBtn}>
                {posting ? 'Posting...' : 'Publish Official Post'}
              </button>
            </motion.div>

            <motion.div
              className={styles.broadcastCard}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2>
                <FaBell /> Send Push Notification
              </h2>
              <div className={styles.formGroup}>
                <label>Notification Title</label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Important Update"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Notification Message</label>
                <textarea
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Your message to all users..."
                  rows={6}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.warningBox}>
                ⚠️ This will send a notification to all registered users
              </div>

              <button onClick={sendNotification} disabled={sendingNotif} className={styles.dangerBtn}>
                {sendingNotif ? 'Sending...' : 'Send to All Users'}
              </button>
            </motion.div>
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
