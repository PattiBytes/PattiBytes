// app-next/components/ShareButton.tsx
import { incrementShare } from '@/lib/shares';

type Props = { postId: string; url: string; className?: string; ariaLabel?: string };

export default function ShareButton({ postId, url, className, ariaLabel = 'Share' }: Props) {
  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch {
      // ignore user cancel
    } finally {
      try { await incrementShare(postId); } catch {}
    }
  };

  return (
    <button type="button" onClick={onShare} className={className} aria-label={ariaLabel} title={ariaLabel}>
      Share
    </button>
  );
}
