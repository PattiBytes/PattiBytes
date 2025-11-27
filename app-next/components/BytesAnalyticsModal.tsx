// app-next/components/BytesAnalyticsModal.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaHeart,
  FaComment,
  FaChartLine,
  FaClock,
} from 'react-icons/fa';
import styles from '@/styles/BytesAnalyticsModal.module.css';

interface UserByte {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text?: string;
  createdAt: Date;
  expiresAt: Date;
  likesCount: number;
  commentsCount: number;
  userId: string;
}

interface BytesAnalyticsModalProps {
  open: boolean;
  byte: UserByte | null;
  onClose: () => void;
}

export default function BytesAnalyticsModal({
  open,
  byte,
  onClose,
}: BytesAnalyticsModalProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!byte) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const diff = byte.expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [byte]);

  if (!byte) return null;

  const engagementRate =
    byte.likesCount + byte.commentsCount > 0
      ? (
          ((byte.likesCount + byte.commentsCount) /
            (byte.likesCount + byte.commentsCount + 10)) *
          100
        ).toFixed(1)
      : '0';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={styles.modalHeader}>
              <h2>Byte Analytics</h2>
              <button
                onClick={onClose}
                className={styles.closeBtn}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalContent}>
              {/* Byte Preview */}
              <div className={styles.bytePreview}>
                {byte.mediaType === 'video' ? (
                  <video
                    src={byte.mediaUrl}
                    className={styles.previewMedia}
                    controls
                  />
                ) : (
                  <img
                    src={byte.mediaUrl}
                    alt="Byte"
                    className={styles.previewMedia}
                  />
                )}
              </div>

              {/* Analytics Stats */}
              <div className={styles.statsGrid}>
                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className={styles.statIcon}>
                    <FaHeart />
                  </div>
                  <div className={styles.statContent}>
                    <h4>Total Likes</h4>
                    <p className={styles.statValue}>
                      {byte.likesCount}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className={styles.statIcon}>
                    <FaComment />
                  </div>
                  <div className={styles.statContent}>
                    <h4>Total Comments</h4>
                    <p className={styles.statValue}>
                      {byte.commentsCount}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className={styles.statIcon}>
                    <FaChartLine />
                  </div>
                  <div className={styles.statContent}>
                    <h4>Engagement</h4>
                    <p className={styles.statValue}>{engagementRate}%</p>
                  </div>
                </motion.div>

                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className={styles.statIcon}>
                    <FaClock />
                  </div>
                  <div className={styles.statContent}>
                    <h4>Time Left</h4>
                    <p className={styles.statValue}>{timeLeft}</p>
                  </div>
                </motion.div>
              </div>

              {/* Details */}
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span>Posted</span>
                  <span>
                    {byte.createdAt.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span>Type</span>
                  <span className={styles.badge}>
                    {byte.mediaType}
                  </span>
                </div>
                {byte.text && (
                  <div className={styles.detailRow}>
                    <span>Caption</span>
                    <span className={styles.caption}>{byte.text}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={onClose}
                className={styles.closeFullBtn}
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
