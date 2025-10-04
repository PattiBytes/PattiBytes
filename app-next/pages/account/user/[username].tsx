import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { UserProfile } from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaLink, FaCalendar, FaEdit, FaNewspaper, FaPen } from 'react-icons/fa';
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

  useEffect(() => {
    if (!username) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const { db } = getFirebaseClient();
        if (!db) throw new Error('Firestore not initialized');

        // Query users collection by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          router.replace('/404');
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as UserProfile;
        setProfile(userData);

        // Check if viewing own profile
        setIsOwnProfile(currentUser?.uid === userData.uid);

        // Load user's posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', userData.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const userPosts = postsSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
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
                {isOwnProfile ? (
                  <ProfilePictureUpload />
                ) : (
                  <SafeImage
                    src={profile.photoURL}
                    alt={profile.displayName}
                    width={120}
                    height={120}
                    className={styles.avatar}
                  />
                )}
              </div>

              <div className={styles.userDetails}>
                <div className={styles.nameSection}>
                  <h1>{profile.displayName}</h1>
                  <p className={styles.username}>@{profile.username}</p>
                </div>

                {isOwnProfile && (
                  <Link href="/settings" className={styles.editBtn}>
                    <FaEdit /> Edit Profile
                  </Link>
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
              <FaNewspaper /> Posts
            </h2>

            {posts.length === 0 ? (
              <div className={styles.noPosts}>
                <FaPen className={styles.noPostsIcon} />
                <p>{isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}</p>
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
                      <h3>{post.title}</h3>
                      {post.preview && <p>{post.preview}</p>}
                      <div className={styles.postMeta}>
                        <span className={styles.postType}>{post.type}</span>
                        <span className={styles.postStats}>
                          {post.likesCount} likes · {post.commentsCount} comments
                        </span>
                      </div>
                    </div>
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
