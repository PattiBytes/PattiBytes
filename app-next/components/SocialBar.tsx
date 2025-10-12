// app-next/components/SocialBar.tsx
import LikeButton from '@/components/LikeButton';
import styles from '@/styles/Social.module.css';
import { FaShareAlt } from 'react-icons/fa';

export default function SocialBar({ postId, url }: { postId: string; url: string }) {
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.actionBar}>
      <LikeButton postId={postId} className={styles.pill} showCount />
      <button className={`${styles.pill} ${styles.share}`} onClick={handleShare} title="Share">
        <span className={styles.icon}><FaShareAlt /></span>
        <span>Share</span>
      </button>
    </div>
  );
}
