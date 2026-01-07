// app-next/components/FeedPostCard.tsx
import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import SafeImage from '@/components/SafeImage';
import VideoReel from '@/components/VideoReel';
import ShareButton from '@/components/ShareButton';
import LikeButton from '@/components/LikeButton';
import { useLongPress } from '@/hooks/useLongPress';
import {
  FaMapMarkerAlt,
  FaNewspaper,
  FaPen,
  FaVideo,
  FaEye,
  FaComment,
  FaTrash,
} from 'react-icons/fa';
import styles from '@/styles/Dashboard.module.css';

type PostType = 'news' | 'place' | 'writing' | 'video';

export interface Post {
  id: string;
  title: string;
  content: string;
  preview?: string;
  type: PostType;
  source: 'user' | 'cms';
  authorId?: string;
  authorName: string;
  authorUsername?: string;
  authorPhoto?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  location?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  url?: string;
  slug?: string;
  isOfficial?: boolean;
}

function getPostIcon(type: string) {
  switch (type) {
    case 'news':
      return <FaNewspaper />;
    case 'place':
      return <FaMapMarkerAlt />;
    case 'writing':
      return <FaPen />;
    case 'video':
      return <FaVideo />;
    default:
      return null;
  }
}

function shouldStartLongPress(e: React.PointerEvent) {
  const el = e.target as HTMLElement | null;
  if (el?.closest('a,button,input,textarea,select,label')) return false;
  return true;
}

export default function FeedPostCard(props: {
  post: Post;
  index: number;
  currentUid?: string;
  isAdmin: boolean;
  onDelete: (postId: string, title: string) => void;
  onOpenActions?: (post: Post) => void;
}) {
  const { post, index, currentUid, isAdmin, onDelete, onOpenActions } = props;

  const isUserPost = post.source === 'user' && !post.id.startsWith('cms-');
  const isVideoPost = post.type === 'video' || post.mediaType === 'video';

  const readMoreHref = useMemo(() => {
    if (post.source === 'cms') {
      if (post.type === 'news') {
        return `/news/${post.slug || post.id.replace('cms-news-', '')}`;
      }
      if (post.type === 'place') {
        return `/places/${post.slug || post.id.replace('cms-place-', '')}`;
      }
      return `/posts/${post.id}`;
    }

    // User posts
    if (isVideoPost) {
      // Dedicated video watch page
      return `/videos/${post.id}`;
    }

    return `/posts/${post.id}`;
  }, [post.id, post.slug, post.source, post.type, isVideoPost]);

  const commentsHref = useMemo(
    () => `${readMoreHref}#comments`,
    [readMoreHref],
  );

  const shareUrl = useMemo(() => {
    if (post.url) return post.url;
    if (typeof window === 'undefined') return readMoreHref;
    return `${window.location.origin}${readMoreHref}`;
  }, [post.url, readMoreHref]);

  const canDelete = isUserPost && (currentUid === post.authorId || isAdmin);

  const comments = post.commentsCount ?? 0;
  const shares = post.sharesCount ?? 0;
  const views = post.viewsCount ?? 0;

  const { handlers } = useLongPress(
    () => {
      onOpenActions?.(post);
    },
    {
      ms: 460,
      moveTolerancePx: 12,
      preventContextMenu: true,
      shouldStart: shouldStartLongPress,
    },
  );

  return (
    <motion.article
      key={post.id}
      className={styles.postCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.4 }}
      {...handlers}
    >
      {/* Header */}
      <div className={styles.postHeader}>
        {post.source === 'user' && post.authorUsername ? (
          <Link
            href={`/user/${post.authorUsername}`}
            className={styles.author}
          >
            <SafeImage
              src={post.authorPhoto || '/images/default-avatar.png'}
              alt={post.authorName}
              width={48}
              height={48}
              className={styles.authorAvatar}
            />
            <div className={styles.authorInfo}>
              <h4>{post.authorName}</h4>
              <p>@{post.authorUsername}</p>
            </div>
          </Link>
        ) : (
          <div className={styles.author}>
            <div className={styles.authorAvatarPlaceholder}>
              {post.authorName.charAt(0).toUpperCase()}
            </div>
            <div className={styles.authorInfo}>
              <h4>{post.authorName}</h4>
              <p className={styles.cmsLabel}>Official</p>
            </div>
          </div>
        )}

        <div className={styles.postMeta}>
          <div className={styles.postType}>
            {getPostIcon(post.type)}
            <span>{post.type}</span>
          </div>
          {views > 0 && (
            <div className={styles.views}>
              <FaEye /> {views}
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      {isVideoPost && post.videoUrl ? (
        <Link href={readMoreHref} className={styles.postImage}>
          <VideoReel src={post.videoUrl} poster={post.imageUrl} />
        </Link>
      ) : post.imageUrl ? (
        <div className={styles.postImage}>
          <SafeImage
            src={post.imageUrl}
            alt={post.title}
            width={600}
            height={400}
            className="image"
          />
        </div>
      ) : null}

      {/* Content */}
      <div className={styles.postContent}>
        {post.title && <h3>{post.title}</h3>}
        {post.location && (
          <p className={styles.location}>
            <FaMapMarkerAlt /> {post.location}
          </p>
        )}
        {(post.preview || post.content) && (
          <p>{String(post.preview || post.content).substring(0, 220)}...</p>
        )}
        <Link href={readMoreHref} className={styles.readMore}>
          {isVideoPost ? 'Watch Video →' : 'Read More →'}
        </Link>
      </div>

      {/* Actions */}
      <div className={styles.postActions}>
        <LikeButton
          postId={post.id}
          className={styles.actionButton}
          showCount
        />

        <Link
          href={commentsHref}
          className={styles.actionButton}
          aria-label="Comments"
        >
          <FaComment />
          <span>{comments}</span>
        </Link>

        <ShareButton
          postId={post.id}
          url={shareUrl}
          className={styles.actionButton}
        />

        {canDelete && (
          <button
            className={styles.actionButton}
            onClick={() => onDelete(post.id, post.title)}
            aria-label="Delete"
            title="Delete post"
            type="button"
          >
            <FaTrash />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className={styles.postFooter}>
        <span>{post.createdAt.toLocaleDateString()}</span>
        <span>
          {comments} comments • {shares} shares{' '}
          {views ? `• ${views} views` : ''}
        </span>
        {(post.isOfficial || post.source === 'cms') && (
          <span className={styles.officialBadge}>Official</span>
        )}
      </div>
    </motion.article>
  );
}
