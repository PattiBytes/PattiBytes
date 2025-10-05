import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, serverTimestamp, Timestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { FaHeart, FaComment, FaShare, FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from '@/styles/PostDetail.module.css';

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  imageUrl?: string;
  location?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  likes: string[];
}

interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: Date;
}

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, userProfile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const loadPost = async () => {
      try {
        const { db } = getFirebaseClient();
        if (!db) throw new Error('Firestore not initialized');

        const postDoc = await getDoc(doc(db, 'posts', id));
        if (!postDoc.exists()) {
          router.push('/404');
          return;
        }

        const data = postDoc.data();
        setPost({
          id: postDoc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          likes: data.likes || []
        } as Post);

        const commentsQuery = query(
          collection(db, 'posts', id, 'comments'),
          orderBy('createdAt', 'desc')
        );
        const commentsSnap = await getDocs(commentsQuery);
        setComments(commentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Comment[]);
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, router]);

  const handleLike = async () => {
    if (!user || !post) return;

    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const postRef = doc(db, 'posts', post.id);
      const isLiked = post.likes.includes(user.uid);

      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
          likesCount: Math.max(0, post.likesCount - 1)
        });
        setPost({ ...post, likes: post.likes.filter(id => id !== user.uid), likesCount: Math.max(0, post.likesCount - 1) });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
          likesCount: post.likesCount + 1
        });
        setPost({ ...post, likes: [...post.likes, user.uid], likesCount: post.likesCount + 1 });
      }
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !post || !newComment.trim()) return;

    setCommenting(true);
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        text: newComment,
        authorId: user.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: post.commentsCount + 1
      });

      setNewComment('');
      toast.success('Comment posted!');
      
      const commentsQuery = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'desc'));
      const commentsSnap = await getDocs(commentsQuery);
      setComments(commentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Comment[]);
      
      setPost({ ...post, commentsCount: post.commentsCount + 1 });
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to post comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.content.substring(0, 100), url: shareUrl });
        const { db } = getFirebaseClient();
        if (db) {
          await updateDoc(doc(db, 'posts', post.id), { sharesCount: post.sharesCount + 1 });
          setPost({ ...post, sharesCount: post.sharesCount + 1 });
        }
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading...">
          <div className={styles.loading}><div className={styles.spinner} /><p>Loading post...</p></div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!post) {
    return (
      <AuthGuard>
        <Layout title="Post Not Found">
          <div className={styles.notFound}><h2>Post not found</h2><Link href="/dashboard">Go to Dashboard</Link></div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout title={`${post.title} - PattiBytes`}>
        <div className={styles.postDetail}>
          <Link href="/dashboard" className={styles.backBtn}><FaArrowLeft /> Back</Link>

          <article className={styles.post}>
            <div className={styles.postHeader}>
              <Link href={`/user/${post.authorUsername}`} className={styles.author}>
                <SafeImage src={post.authorPhoto} alt={post.authorName} width={48} height={48} className={styles.avatar} />
                <div><h4>{post.authorName}</h4><p>@{post.authorUsername}</p></div>
              </Link>
            </div>

            {post.imageUrl && (
              <div className={styles.postImage}>
                <SafeImage src={post.imageUrl} alt={post.title} width={800} height={500} className={styles.image} />
              </div>
            )}

            <div className={styles.postContent}>
              <h1>{post.title}</h1>
              {post.location && <p className={styles.location}><FaMapMarkerAlt /> {post.location}</p>}
              <div className={styles.content}>{post.content}</div>
              <span className={styles.date}>{post.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <div className={styles.actions}>
              <button onClick={handleLike} className={`${styles.actionBtn} ${post.likes.includes(user?.uid || '') ? styles.liked : ''}`}>
                <FaHeart /> {post.likesCount}
              </button>
              <button className={styles.actionBtn}><FaComment /> {post.commentsCount}</button>
              <button onClick={handleShare} className={styles.actionBtn}><FaShare /> {post.sharesCount}</button>
            </div>
          </article>

          <div className={styles.commentsSection} id="comments">
            <h3>Comments ({comments.length})</h3>
            
            <form onSubmit={handleComment} className={styles.commentForm}>
              <SafeImage src={userProfile?.photoURL} alt="You" width={40} height={40} className={styles.commentAvatar} />
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." disabled={commenting} />
              <button type="submit" disabled={commenting || !newComment.trim()}>{commenting ? 'Posting...' : 'Post'}</button>
            </form>

            <div className={styles.comments}>
              {comments.map(comment => (
                <div key={comment.id} className={styles.comment}>
                  <SafeImage src={comment.authorPhoto} alt={comment.authorName} width={40} height={40} className={styles.commentAvatar} />
                  <div className={styles.commentContent}>
                    <div className={styles.commentHeader}><strong>{comment.authorName}</strong><span>{comment.createdAt.toLocaleDateString()}</span></div>
                    <p>{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
