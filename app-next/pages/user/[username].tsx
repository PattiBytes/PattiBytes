import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
  doc,
  getDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { getUserByUsername, UserProfile } from '@/lib/username';
import { isFollowing, followUser, unfollowUser, listFollowers, listFollowing } from '@/lib/follow';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import Link from 'next/link';
import { FaMapMarkerAlt, FaGlobe, FaCalendar, FaUserPlus, FaUserCheck, FaUsers } from 'react-icons/fa';
import styles from '@/styles/PublicProfile.module.css';

type FirestorePostDoc = {
  title?: string;
  content?: string;
  type?: 'news' | 'place' | 'writing' | string;
  imageUrl?: string;
  location?: string;
  createdAt?: Timestamp | Date;
};

interface PostCard {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'place' | 'writing';
  imageUrl?: string;
  location?: string;
  createdAt: Date;
}

export default function PublicProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { username } = router.query;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [following, setFollowing] = useState(false);
  const [busyFollow, setBusyFollow] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);

  const externalWebsite = useMemo(() => {
    if (!profile?.website) return undefined;
    const v = profile.website.trim();
    if (!v) return undefined;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    return `https://${v}`;
  }, [profile?.website]);

  const isOwnProfile = !!(user?.uid && profile?.uid && user.uid === profile.uid);

  useEffect(() => {
    const load = async () => {
      if (!router.isReady) return;
      if (!username || typeof username !== 'string') {
        setLoading(false);
        return;
      }

      try {
        const p = await getUserByUsername(username);
        setProfile(p);

        if (!p) {
          setLoading(false);
          return;
        }

        const { db } = getFirebaseClient();
        if (!db) {
          setLoading(false);
          return;
        }

        // Load posts of this user
        if (p.uid) {
          const q = query(
            collection(db, 'posts'),
            where('authorId', '==', p.uid),
            orderBy('createdAt', 'desc'),
            limit(12)
          );
          const snap = await getDocs(q);

          const items: PostCard[] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
            const raw = d.data() as FirestorePostDoc;
            const created = raw.createdAt instanceof Timestamp ? raw.createdAt.toDate() : new Date();

            // Normalize type to one of the union values
            const t = (raw.type || 'writing').toString();
            const normalizedType: 'news' | 'place' | 'writing' =
              t === 'news' || t === 'place' ? (t as 'news' | 'place') : 'writing';

            return {
              id: d.id,
              title: raw.title || '',
              content: raw.content || '',
              type: normalizedType,
              imageUrl: raw.imageUrl,
              location: raw.location,
              createdAt: created,
            };
          });

          setPosts(items);
        }

        // Is current user following this profile?
        if (user?.uid && p.uid && user.uid !== p.uid) {
          const f = await isFollowing(user.uid, p.uid);
          setFollowing(f);
        }
      } catch (e) {
        console.error('Public profile load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, router.isReady, user?.uid]);

  const handleFollowToggle = async () => {
    if (!user?.uid || !profile?.uid || user.uid === profile.uid) return;
    setBusyFollow(true);
    try {
      if (following) {
        await unfollowUser(user.uid, profile.uid);
        setFollowing(false);
      } else {
        await followUser(user.uid, profile.uid);
        setFollowing(true);
      }
    } catch (e) {
      console.error('Follow toggle error:', e);
    } finally {
      setBusyFollow(false);
    }
  };

  const hydrateProfiles = async (uids: string[]): Promise<UserProfile[]> => {
    const { db } = getFirebaseClient();
    if (!db || uids.length === 0) return [];
    const results: UserProfile[] = [];
    for (const uid of uids) {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) results.push({ uid, ...(snap.data() as Omit<UserProfile, 'uid'>) });
    }
    return results;
  };

  const openFollowers = async () => {
    if (!profile?.uid) return;
    setShowFollowers(true);
    const uids = await listFollowers(profile.uid, 20);
    const list = await hydrateProfiles(uids);
    setFollowersList(list);
  };

  const openFollowing = async () => {
    if (!profile?.uid) return;
    setShowFollowing(true);
    const uids = await listFollowing(profile.uid, 20);
    const list = await hydrateProfiles(uids);
    setFollowingList(list);
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Profile - PattiBytes">
          <div className={styles.container}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!profile) {
    return (
      <AuthGuard>
        <Layout title="User Not Found - PattiBytes">
          <div className={styles.container}>
            <div className={styles.notFound}>
              <h1>User not found</h1>
              <Link href="/search">← Back to Search</Link>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout title={`${profile.displayName} (@${profile.username}) - PattiBytes`}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.avatarSection}>
              {isOwnProfile ? (
                <ProfilePictureUpload
                  onUploaded={(newUrl: string) => {
                    // Optimistic update
                    setProfile((prev) => (prev ? { ...prev, photoURL: newUrl } : prev));
                  }}
                />
              ) : (
                <div className={styles.avatarLarge}>
                  <SafeImage src={profile.photoURL} alt={profile.displayName} width={120} height={120} />
                </div>
              )}
            </div>
            <div className={styles.info}>
              <h1>{profile.displayName}</h1>
              <div className={styles.username}>@{profile.username}</div>

              {profile.bio && <div className={styles.bio}>{profile.bio}</div>}

              <div className={styles.meta}>
                {profile.location && (
                  <span className={styles.metaItem}>
                    <FaMapMarkerAlt /> {profile.location}
                  </span>
                )}
                {externalWebsite && (
                  <a href={externalWebsite} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
                    <FaGlobe /> {profile.website?.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile.createdAt && (
                  <span className={styles.metaItem}>
                    <FaCalendar /> Joined{' '}
                    {profile.createdAt instanceof Timestamp
                      ? (profile.createdAt as Timestamp).toDate().toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className={styles.followBar}>
                <button className={styles.countBtn} onClick={openFollowers}>
                  <FaUsers /> <strong>{profile.stats?.followersCount ?? 0}</strong> Followers
                </button>
                <button className={styles.countBtn} onClick={openFollowing}>
                  <FaUsers /> <strong>{profile.stats?.followingCount ?? 0}</strong> Following
                </button>

                {user?.uid && user.uid !== profile.uid && (
                  <button
                    className={following ? styles.unfollowBtn : styles.followBtn}
                    onClick={handleFollowToggle}
                    disabled={busyFollow}
                    aria-pressed={following}
                  >
                    {following ? (
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
            </div>
          </div>

          <section className={styles.postsSection}>
            <h2>Recent Posts</h2>
            {posts.length === 0 ? (
              <div className={styles.noPosts}>No posts yet</div>
            ) : (
              <div className={styles.postsGrid}>
                {posts.map((p) => (
                  <Link href={`/posts/${p.id}`} key={p.id} className={styles.postCard}>
                    {p.imageUrl && (
                      <div className={styles.postImage}>
                        <SafeImage src={p.imageUrl} alt={p.title} width={600} height={400} />
                      </div>
                    )}
                    <div className={styles.postContent}>
                      <span className={styles.postType}>{p.type}</span>
                      <h3>{p.title}</h3>
                      <div className={styles.postDate}>{p.createdAt.toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Followers Modal */}
        {showFollowers && (
          <div className={styles.listModal} onClick={() => setShowFollowers(false)}>
            <div className={styles.listPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.listHeader}>
                <h3>Followers</h3>
                <button className={styles.closeBtn} onClick={() => setShowFollowers(false)}>
                  ×
                </button>
              </div>
              <div className={styles.listBody}>
                {followersList.length === 0 ? (
                  <div className={styles.emptyList}>No followers yet</div>
                ) : (
                  followersList.map((u) => (
                    <Link href={`/user/${u.username}`} key={u.uid} className={styles.listItem}>
                      <SafeImage src={u.photoURL} alt={u.displayName} width={40} height={40} className={styles.listAvatar} />
                      <div className={styles.listInfo}>
                        <strong>{u.displayName}</strong>
                        <span>@{u.username}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Following Modal */}
        {showFollowing && (
          <div className={styles.listModal} onClick={() => setShowFollowing(false)}>
            <div className={styles.listPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.listHeader}>
                <h3>Following</h3>
                <button className={styles.closeBtn} onClick={() => setShowFollowing(false)}>
                  ×
                </button>
              </div>
              <div className={styles.listBody}>
                {followingList.length === 0 ? (
                  <div className={styles.emptyList}>Not following anyone yet</div>
                ) : (
                  followingList.map((u) => (
                    <Link href={`/user/${u.username}`} key={u.uid} className={styles.listItem}>
                      <SafeImage src={u.photoURL} alt={u.displayName} width={40} height={40} className={styles.listAvatar} />
                      <div className={styles.listInfo}>
                        <strong>{u.displayName}</strong>
                        <span>@{u.username}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  );
}
