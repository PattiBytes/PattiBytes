// app-next/components/ShareButton.tsx
import { useState } from 'react';
import { FaShareAlt, FaCheck, FaFacebook, FaTwitter, FaWhatsapp, FaLinkedin, FaCopy, FaTimes } from 'react-icons/fa';
import { incrementShare } from '@/lib/shares';
import styles from '@/styles/ShareButton.module.css';

type Props = { 
  postId: string; 
  url: string; 
  title?: string; 
  className?: string; 
  ariaLabel?: string;
  compact?: boolean;
};

export default function ShareButton({ postId, url, title, className, ariaLabel = 'Share', compact = false }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
      await incrementShare(postId);
    } catch {
      alert('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: title || 'Check this out from PattiBytes!', url });
        await incrementShare(postId);
        setShowMenu(false);
      }
    } catch {
      // User cancelled share
    }
  };

  const handleSocialShare = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin') => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title || 'Check this out from PattiBytes!');
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
    await incrementShare(postId);
    setShowMenu(false);
  };

  const hasNativeShare = typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={styles.shareContainer}>
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className={className || (compact ? styles.shareBtnCompact : styles.shareBtn)}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <FaShareAlt />
        {!compact && <span>Share</span>}
      </button>

      {showMenu && (
        <>
          <div className={styles.shareMenu}>
            <div className={styles.menuHeader}>
              <span>Share this post</span>
              <button onClick={() => setShowMenu(false)} className={styles.closeBtn} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className={styles.menuBody}>
              {hasNativeShare && (
                <button onClick={handleNativeShare} className={styles.menuItem}>
                  <FaShareAlt className={styles.iconDefault} />
                  <span>Share via...</span>
                </button>
              )}

              <button onClick={() => handleSocialShare('facebook')} className={styles.menuItem}>
                <FaFacebook className={styles.iconFacebook} />
                <span>Facebook</span>
              </button>

              <button onClick={() => handleSocialShare('twitter')} className={styles.menuItem}>
                <FaTwitter className={styles.iconTwitter} />
                <span>Twitter</span>
              </button>

              <button onClick={() => handleSocialShare('whatsapp')} className={styles.menuItem}>
                <FaWhatsapp className={styles.iconWhatsapp} />
                <span>WhatsApp</span>
              </button>

              <button onClick={() => handleSocialShare('linkedin')} className={styles.menuItem}>
                <FaLinkedin className={styles.iconLinkedin} />
                <span>LinkedIn</span>
              </button>

              <button onClick={handleCopy} className={`${styles.menuItem} ${copied ? styles.menuItemSuccess : ''}`}>
                {copied ? <FaCheck className={styles.iconSuccess} /> : <FaCopy className={styles.iconDefault} />}
                <span>{copied ? 'Link copied!' : 'Copy link'}</span>
              </button>
            </div>
          </div>
          <div className={styles.overlay} onClick={() => setShowMenu(false)} />
        </>
      )}
    </div>
  );
}
