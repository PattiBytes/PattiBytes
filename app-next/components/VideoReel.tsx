// app-next/components/VideoReel.tsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useId,
} from 'react';
import {
  FaPlay,
  FaPause,
  FaVolumeMute,
  FaVolumeUp,
} from 'react-icons/fa';
import clsx from 'clsx';
import styles from '@/styles/Reel.module.css';

export interface VideoReelProps {
  src: string;
  poster?: string;
  /** Try to auto-play when the reel is in view (recommended for feeds) */
  autoPlay?: boolean;
  /** Start muted (recommended for reels) */
  muted?: boolean;
  /** Loop the video */
  loop?: boolean;
  /** Extra className to customize outer wrapper if needed */
  className?: string;
  /** Optional callback when play / pause changes */
  onPlayChange?(isPlaying: boolean): void;
}

/**
 * Vertical 9:16 video player, responsive and reel-style.
 * - Auto-plays when mostly visible.
 * - Pauses when scrolled away.
 * - Tap/click to play/pause.
 * - Mute/unmute control.
 * - Shows a lightweight progress bar and time indicator.
 */
const VideoReel: React.FC<VideoReelProps> = ({
  src,
  poster,
  autoPlay = true,
  muted = true,
  loop = true,
  className,
  onPlayChange,
}) => {
  const id = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isHover, setIsHover] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const niceTime = (t: number) => {
    if (!Number.isFinite(t) || t <= 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (video.paused || video.ended) {
      try {
        await video.play();
        setIsPlaying(true);
        onPlayChange?.(true);
      } catch {
        // autoplay might be blocked; user can tap again
      }
    } else {
      video.pause();
      setIsPlaying(false);
      onPlayChange?.(false);
    }
  }, [isReady, onPlayChange]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Load metadata and track time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      setDuration(video.duration || 0);
      setIsReady(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  // Auto play/pause when in viewport
  useEffect(() => {
    if (!autoPlay) return;
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // When at least ~60% visible, try to play
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          try {
            await video.play();
            setIsPlaying(true);
            onPlayChange?.(true);
          } catch {
            // ignore
          }
        } else {
          if (!video.paused) {
            video.pause();
            setIsPlaying(false);
            onPlayChange?.(false);
          }
        }
      },
      {
        threshold: [0.3, 0.6, 0.9],
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoPlay, onPlayChange]);

  // Keep internal mute state in sync with prop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    setIsMuted(muted);
  }, [muted]);

  const handleClickMain = (e: React.MouseEvent) => {
    e.preventDefault();
    void togglePlay();
  };

  return (
    <div
      ref={containerRef}
      className={clsx(styles.reelShell, className)}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      aria-label="Video reel"
      aria-describedby={id}
    >
      <div className={styles.reelVideoWrap} onClick={handleClickMain}>
        <video
          ref={videoRef}
          className={styles.reelVideo}
          src={src}
          poster={poster}
          playsInline
          loop={loop}
          muted={isMuted}
        />

        {/* Top & bottom gradients for overlays / controls */}
        <div
          className={`${styles.reelGradient} ${styles.reelGradientTop}`}
        />
        <div
          className={`${styles.reelGradient} ${styles.reelGradientBottom}`}
        />

        {/* Center play / pause indicator */}
        <button
          type="button"
          className={clsx(
            styles.reelCenterIcon,
            (isHover || !isPlaying) && styles.reelCenterIconVisible,
          )}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        {/* Bottom controls: progress + time + mute */}
        <div className={styles.reelControls}>
          <div className={styles.reelProgressTrack}>
            <div
              className={styles.reelProgressFill}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={styles.reelControlsRow}>
            <span className={styles.reelTime}>
              {niceTime(currentTime)} / {niceTime(duration)}
            </span>

            <button
              type="button"
              className={styles.reelMuteButton}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
          </div>
        </div>
      </div>

      {/* For screen readers only; real text is outside in cards/pages */}
      <span id={id} className={styles.reelSrOnly}>
        Short vertical video
      </span>
    </div>
  );
};

export default VideoReel;
