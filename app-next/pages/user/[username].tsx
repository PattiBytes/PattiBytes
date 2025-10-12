// pages/user/[username].tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { getUserByUsername, type UserProfile } from '@/lib/username';
import { isFollowing, followUser, unfollowUser, listFollowers, listFollowing } from '@/lib/follow';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import { useAuth } from '@/context/AuthContext';
import { FaMapMarkerAlt, FaGlobe, FaCalendar, FaUserPlus, FaUserCheck, FaUsers } from 'react-icons/fa';
import styles from '@/styles/PublicProfile.module.css';

type FirestorePostDoc = {
  title?: string;
  content?: string;
  type?: 'news' | 'place' | 'writing' | string;
  imageUrl?: string | null;
  location?: string | null;
  createdAt?: Timestamp | Date;
};

type PostCard = {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'place' | 'writing';
  imageUrl?: string | null;
  location?: string | null;
  createdAt: Date;
};

export default function PublicProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);

  const [following, setFollowing] = useState(false);
  const [busyFollow, setBusyFollow] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);

  const isOwnProfile = !!(user?.uid && profile?.uid && user.uid === profile.uid);

  const externalWebsite = useMemo(() => {
    const v = profile?.website?.trim();
    if (!v) return undefined;
    return v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
  }, [profile?.website]);

  // load profile + initial posts
  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      if (typeof username !== 'string' || !username) {
        setLoading(false);
        return;
      }
      try {
        const up = await getUserByUsername(username);
        setProfile(up);
        if (!up || !db) {
          setLoading(false);
          return;
        }
        const q = fsQuery(
          collection(db, 'posts'),
          where('authorId', '==', up.uid),
          orderBy('createdAt', 'desc'),
          limit(12)
        );
        const snap = await getDocs(q);
        const items: PostCard[] = snap.docs.map((d) => {
          const raw = d.data() as FirestorePostDoc;
          const created = raw.createdAt instanceof Timestamp ? raw.createdAt.toDate() : new Date();
          const t = (raw.type || 'writing').toString();
          const normalizedType: 'news' | 'place' | 'writing' = t === 'news' || t === 'place' ? (t as 'news' | 'place') : 'writing';
          return {
            id: d.id,
            title: raw.title || '',
            content: raw.content || '',
            type: normalizedType,
            imageUrl: raw.imageUrl || null,
            location: raw.location || null,
            createdAt: created,
          };
        });
        setPosts(items);
        setCursor(snap.docs[snap.docs.length - 1] || null);

        if (user?.uid && up.uid && user.uid !== up.uid) {
          try {
            const f = await isFollowing(user.uid, up.uid);
            setFollowing(f);
          } catch {
            setFollowing(false);
          }
        }
      } catch {
        // errors are displayed in UI if needed
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [db, router.isReady, username, user?.uid]);

  const loadMore = useCallback(async () => {
    if (!db || !profile || !cursor) return;
    const q = fsQuery(
      collection(db, 'posts'),
      where('authorId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(12)
    );
    const snap = await getDocs(q);
    const more: PostCard[] = snap.docs.map((d) => {
      const raw = d.data() as FirestorePostDoc;
      const created = raw.createdAt instanceof Timestamp ? raw.createdAt.toDate() : new Date();
      const t = (raw.type || 'writing').toString();
      const normalizedType: 'news' | 'place' | 'writing' = t === 'news' || t === 'place' ? (t as 'news' | 'place') : 'writing';
      return {
        id: d.id,
        title: raw.title || '',
        content: raw.content || '',
        type: normalizedType,
        imageUrl: raw.imageUrl || null,
        location: raw.location || null,
        createdAt: created,
      };
    });
    setPosts((prev) => [...prev, ...more]);
    setCursor(snap.docs[snap.docs.length - 1] || null);
  }, [cursor, db, profile]);

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
    } finally {
      setBusyFollow(false);
    }
  };

  const hydrateProfiles = async (uids: string[]): Promise<UserProfile[]> => {
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
                  currentUrl={profile.photoURL}
                  onUploaded={(newUrl: string) => {
                    // Optimistic update; Auth listener keeps it in sync
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

              {profile.bio ? <div className={styles.bio}>{profile.bio}</div> : null}

              <div className={styles.meta}>
                {profile.location ? (
                  <span className={styles.metaItem}>
                    <FaMapMarkerAlt /> {profile.location}
                  </span>
                ) : null}
                {externalWebsite ? (
                  <a href={externalWebsite} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
                    <FaGlobe /> {profile.website?.replace(/^https?:\/\//, '')}
                  </a>
                ) : null}
                {profile.createdAt ? (
                  <span className={styles.metaItem}>
                    <FaCalendar /> Joined{' '}
                    {profile.createdAt instanceof Timestamp
                      ? (profile.createdAt as Timestamp).toDate().toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </span>
                ) : null}
              </div>

              <div className={styles.followBar}>
                <button className={styles.countBtn} onClick={openFollowers}>
                  <FaUsers /> <strong>{profile.stats?.followersCount ?? 0}</strong> Followers
                </button>
                <button className={styles.countBtn} onClick={openFollowing}>
                  <FaUsers /> <strong>{profile.stats?.followingCount ?? 0}</strong> Following
                </button>

                {user?.uid && user.uid !== profile.uid ? (
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
                ) : null}
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
                    {p.imageUrl ? (
                      <div className={styles.postImage}>
                        <SafeImage src={p.imageUrl} alt={p.title} width={600} height={400} />
                      </div>
                    ) : null}
                    <div className={styles.postContent}>
                      <span className={styles.postType}>{p.type}</span>
                      <h3>{p.title}</h3>
                      <div className={styles.postDate}>{p.createdAt.toLocaleDateString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {cursor ? (
              <div className={styles.loadMore}>
                <button onClick={loadMore}>Load more</button>
              </div>
            ) : null}
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
