import LikeButton from '@/components/LikeButton';
import ShareButton from '@/components/ShareButton';
import styles from '@/styles/Social.module.css';
import { FaShareAlt } from 'react-icons/fa';

export default function SocialBar({ postId, url }: { postId: string; url: string }) {
  return (
    <div className={styles.actionBar}>
      <LikeButton postId={postId} className={styles.pill} />
      <button className={`${styles.pill} ${styles.share}`} onClick={() => navigator.share ? navigator.share({ url }).catch(()=>{}) : navigator.clipboard.writeText(url).then(()=>alert('Link copied'))} title="Share">
        <span className={styles.icon}><FaShareAlt /></span>
        <span>Share</span>
      </button>
    </div>
  );
}
