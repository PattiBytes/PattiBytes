// app-next/components/UserPostCard.tsx
import { motion } from 'framer-motion';
import Link from 'next/link';
import SafeImage from '@/components/SafeImage';
import { FaNewspaper, FaMapPin, FaPen, FaHeart, FaComment, FaEye, FaMapMarkerAlt } from 'react-icons/fa';
import styles from '@/styles/UserProfile.module.css';
import type { PostCard } from '@/pages/user/[username]';

interface UserPostCardProps {
  post: PostCard;
  index: number;
  isOwnProfile?: boolean;
  currentUserId?: string;
}

export default function UserPostCard({ post, index }: UserPostCardProps) {
  const getPostIcon = (type: string) => {
    switch (type) {
      case 'news': return <FaNewspaper />;
      case 'place': return <FaMapPin />;
      case 'writing': return <FaPen />;
      default: return <FaPen />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'news': return '#ef4444';
      case 'place': return '#10b981';
      case 'writing': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={styles.postCard}
    >
      <Link href={`/posts/${post.id}`} className={styles.postLink}>
        {(post.imageUrl || post.videoUrl) && (
          <div className={styles.postMedia}>
            {post.videoUrl ? (
              <video 
                src={post.videoUrl} 
                poster={post.imageUrl || undefined}
                className={styles.postVideo}
                muted
              />
            ) : post.imageUrl ? (
              <SafeImage
                src={post.imageUrl}
                alt={post.title}
                width={600}
                height={400}
                className={styles.postImage}
              />
            ) : null}
          </div>
        )}

        <div className={styles.postContent}>
          <div className={styles.postHeader}>
            <div 
              className={styles.postType}
              style={{ backgroundColor: getTypeColor(post.type) }}
            >
              {getPostIcon(post.type)}
              <span>{post.type}</span>
            </div>
            <time className={styles.postDate}>
              {post.createdAt.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </div>

          <h3 className={styles.postTitle}>{post.title}</h3>

          {post.content && (
            <p className={styles.postExcerpt}>
              {post.content.length > 120 ? `${post.content.substring(0, 120)}...` : post.content}
            </p>
          )}

          {post.location && (
            <div className={styles.postLocation}>
              <FaMapMarkerAlt />
              <span>{post.location}</span>
            </div>
          )}

          <div className={styles.postStats}>
            <div className={styles.postStat}>
              <FaHeart />
              <span>{post.likesCount}</span>
            </div>
            <div className={styles.postStat}>
              <FaComment />
              <span>{post.commentsCount}</span>
            </div>
            {post.viewsCount > 0 && (
              <div className={styles.postStat}>
                <FaEye />
                <span>{post.viewsCount}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
