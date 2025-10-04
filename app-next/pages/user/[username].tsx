import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { getUserByUsername } from '@/lib/username';
import type { UserProfile } from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaLink, FaCalendar, FaEdit, FaNewspaper, FaPen, FaTwitter, FaInstagram, FaYoutube, FaUserPlus, FaUserCheck } from 'react-icons/fa';
import Link from 'next/link';
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
  const { user: currentUser } = useAuth();
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

        // Get user profile by username
        const userData = await getUserByUsername(username);

        if (!userData) {
          router.replace('/404');
          return;
        }

        setProfile(userData);
        setIsOwnProfile(currentUser?.uid === userData.uid);

        // Load user's posts
        const { db } = getFirebaseClient();
        if (!db) throw new Error('Firestore not initialized');

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
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, currentUser, router]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    
    setFollowLoading(true);
    try {
      // TODO: Implement follow/unfollow logic
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
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
                  <button 
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={isFollowing ? styles.followingBtn : styles.followBtn}
                  >
                    {followLoading ? (
                      'Loading...'
                    ) : isFollowing ? (
                      <>
                        <FaUserCheck /> Following
                      </>
                    ) : (
                      <>
                        <FaUserPlus /> Follow
                      </>
                    )}
                  </button>
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
                  <FaCalendar /> Joined {new Date(profile.createdAt ? profile.createdAt.toString() : Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <strong>{profile.stats?.postsCount || 0}</strong>
                  <span>Posts</span>
                </div>
                <div className={styles.statItem}>
                  <strong>{profile.stats?.followersCount || 0}</strong>
                  <span>Followers</span>
                </div>
                <div className={styles.statItem}>
                  <strong>{profile.stats?.followingCount || 0}</strong>
                  <span>Following</span>
                </div>
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
