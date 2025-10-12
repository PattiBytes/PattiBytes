// components/VideoReel.tsx
import { useEffect, useRef, useState } from 'react';
import { FaVolumeMute, FaVolumeUp, FaPlay, FaPause, FaShareAlt } from 'react-icons/fa';
import styles from '@/styles/Reel.module.css';

interface VideoReelProps {
  src: string;
  poster?: string | null;
  onShare?: () => void;
}

export default function VideoReel({ src, poster, onShare }: VideoReelProps) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const el = vidRef.current;
    if (!el) return;
    el.muted = true;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.play().catch(() => {});
            setPlaying(true);
          } else {
            el.pause();
            setPlaying(false);
          }
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const togglePlay = () => {
    const el = vidRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const el = vidRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  return (
    <div className={styles.reel}>
      <video
        ref={vidRef}
        src={src}
        poster={poster || undefined}
        playsInline
        loop
        muted
        className={styles.video}
        controls={false}
      />
      <div className={styles.overlay}>
        <button onClick={toggleMute} className={styles.control} aria-label="Mute">
          {muted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <button onClick={togglePlay} className={styles.control} aria-label="Play/Pause">
          {playing ? <FaPause /> : <FaPlay />}
        </button>
        {onShare && (
          <button onClick={onShare} className={styles.control} aria-label="Share">
            <FaShareAlt />
          </button>
        )}
      </div>
    </div>
  );
}
