import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { getUserByUsername } from '@/lib/username';
import type { UserProfile } from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaLink, FaCalendar, FaEdit, FaNewspaper, FaPen, FaTwitter, FaInstagram, FaYoutube, FaUserPlus, FaUserCheck, FaComments } from 'react-icons/fa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from '@/styles/UserProfile.module.css';

interface Post {
  id: string;
  title: string;
  preview?: string;
  type: string;
  imageUrl?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
}

export default function UserProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const { user: currentUser, userProfile: currentUserProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!username || typeof username !== 'string') return;

    const loadProfile = async () => {
      try {
        setLoading(true);

        const userData = await getUserByUsername(username);

        if (!userData) {
          router.replace('/404');
          return;
        }

        setProfile(userData);
        setIsOwnProfile(currentUser?.uid === userData.uid);

        // Check if following
        if (currentUser && currentUser.uid !== userData.uid) {
          const { db } = getFirebaseClient();
          if (db) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const following = userDoc.data()?.following || [];
            setIsFollowing(following.includes(userData.uid));
          }
        }

        // Load user's posts
        const { db } = getFirebaseClient();
        if (!db) throw new Error('Firestore not initialized');

        try {
          const postsQuery = query(
            collection(db, 'posts'),
            where('authorId', '==', userData.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          
          const postsSnapshot = await getDocs(postsQuery);
          const userPosts = postsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
            };
          }) as Post[];

          setPosts(userPosts);
        } catch (error) {
          console.error('Error loading posts:', error);
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, currentUser, router]);

  const handleFollow = async () => {
    if (!currentUser || !profile || !currentUserProfile) return;
    
    setFollowLoading(true);
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      if (isFollowing) {
        // Unfollow
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayRemove(profile.uid)
        });
        await updateDoc(doc(db, 'users', profile.uid), {
          followers: arrayRemove(currentUser.uid)
        });
        setIsFollowing(false);
        toast.success(`Unfollowed ${profile.displayName}`);
      } else {
        // Follow
        await updateDoc(doc(db, 'users', currentUser.uid), {
          following: arrayUnion(profile.uid)
        });
        await updateDoc(doc(db, 'users', profile.uid), {
          followers: arrayUnion(currentUser.uid)
        });
        setIsFollowing(true);
        toast.success(`Following ${profile.displayName}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !profile || !currentUserProfile) return;

    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      // Check if chat exists
      const chatsQuery = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('participants', 'array-contains', currentUser.uid)
      );

      const chatsSnapshot = await getDocs(chatsQuery);
      let existingChat = null;

      chatsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(profile.uid)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        router.push(`/community/${existingChat}`);
      } else {
        // Create new chat
        const newChat = await addDoc(collection(db, 'chats'), {
          type: 'private',
          name: profile.displayName,
          photoURL: profile.photoURL,
          participants: [currentUser.uid, profile.uid],
          lastMessage: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isOfficial: false
        });

        router.push(`/community/${newChat.id}`);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const formatJoinDate = (date: unknown): string => {
    try {
      if (!date) return 'Recently';
      
      let parsedDate: Date;
      
      if (date instanceof Timestamp) {
        parsedDate = date.toDate();
      } else if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
        parsedDate = date.toDate();
      } else if (date instanceof Date) {
        parsedDate = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        parsedDate = new Date(date);
      } else {
        return 'Recently';
      }

      if (isNaN(parsedDate.getTime())) {
        return 'Recently';
      }

      return parsedDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading...">
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading profile...</p>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!profile) {
    return (
      <AuthGuard>
        <Layout title="User Not Found">
          <div className={styles.notFound}>
            <h2>User not found</h2>
            <p>This user doesn&apos;t exist or has been removed.</p>
            <Link href="/dashboard" className={styles.backBtn}>
              Go to Dashboard
            </Link>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout title={`${profile.displayName} (@${profile.username}) - PattiBytes`}>
        <div className={styles.profile}>
          {/* Profile Header */}
          <div className={styles.header}>
            <div className={styles.coverPhoto}>
              <div className={styles.coverGradient} />
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.avatarSection}>
                <SafeImage
                  src={profile.photoURL}
                  alt={profile.displayName}
                  width={120}
                  height={120}
                  className={styles.avatar}
                />
              </div>

              <div className={styles.userDetails}>
                <div className={styles.nameSection}>
                  <h1>{profile.displayName}</h1>
                  <p className={styles.username}>@{profile.username}</p>
                </div>

                {isOwnProfile ? (
                  <Link href="/profile" className={styles.editBtn}>
                    <FaEdit /> Edit Profile
                  </Link>
                ) : (
                  <div className={styles.actionButtons}>
                    <button 
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={isFollowing ? styles.followingBtn : styles.followBtn}
                    >
                      {followLoading ? 'Loading...' : isFollowing ? <><FaUserCheck /> Following</> : <><FaUserPlus /> Follow</>}
                    </button>
                    <button onClick={handleMessage} className={styles.messageBtn}>
                      <FaComments /> Message
                    </button>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className={styles.bio}>{profile.bio}</p>
              )}

              <div className={styles.metadata}>
                {profile.location && (
                  <span className={styles.metaItem}>
                    <FaMapMarkerAlt /> {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a 
                    href={profile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.metaItem}
                  >
                    <FaLink /> {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile.socialLinks?.twitter && (
                  <a 
                    href={`https://twitter.com/${profile.socialLinks.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.metaItem}
                  >
                    <FaTwitter /> Twitter
                  </a>
                )}
                {profile.socialLinks?.instagram && (
                  <a 
                    href={`https://instagram.com/${profile.socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.metaItem}
                  >
                    <FaInstagram /> Instagram
                  </a>
                )}
                {profile.socialLinks?.youtube && (
                  <a 
                    href={profile.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.metaItem}
                  >
                    <FaYoutube /> YouTube
                  </a>
                )}
                <span className={styles.metaItem}>
                  <FaCalendar /> Joined {formatJoinDate(profile.createdAt)}
                </span>
              </div>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <strong>{profile.stats?.postsCount || posts.length}</strong>
                  <span>Posts</span>
                </div>
                <Link href={`/user/${profile.username}/followers`} className={styles.statItem}>
                  <strong>{profile.stats?.followersCount || 0}</strong>
                  <span>Followers</span>
                </Link>
                <Link href={`/user/${profile.username}/following`} className={styles.statItem}>
                  <strong>{profile.stats?.followingCount || 0}</strong>
                  <span>Following</span>
                </Link>
              </div>
            </div>
          </div>

          {/* User Posts */}
          <div className={styles.postsSection}>
            <h2>
              <FaNewspaper /> {isOwnProfile ? 'My Posts' : 'Posts'}
            </h2>

            {posts.length === 0 ? (
              <div className={styles.noPosts}>
                <FaPen className={styles.noPostsIcon} />
                <p>{isOwnProfile ? "You haven't posted anything yet" : `${profile.displayName} hasn't posted anything yet`}</p>
                {isOwnProfile && (
                  <Link href="/create" className={styles.createBtn}>
                    Create Your First Post
                  </Link>
                )}
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {posts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    className={styles.postCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/posts/${post.id}`}>
                      {post.imageUrl && (
                        <div className={styles.postImage}>
                          <SafeImage
                            src={post.imageUrl}
                            alt={post.title}
                            width={300}
                            height={200}
                            className={styles.image}
                          />
                        </div>
                      )}
                      <div className={styles.postContent}>
                        <span className={styles.postType}>{post.type}</span>
                        <h3>{post.title}</h3>
                        {post.preview && <p>{post.preview}</p>}
                        <div className={styles.postMeta}>
                          <span className={styles.postStats}>
                            {post.likesCount} likes · {post.commentsCount} comments
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
