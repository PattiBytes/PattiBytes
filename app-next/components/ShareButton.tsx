// components/ShareButton.tsx
import { FaShareAlt } from 'react-icons/fa';

export default function ShareButton({
  url,
  title,
  className,
  onShared,
}: {
  url: string;
  title?: string;
  className?: string;
  onShared?: () => void;
}) {
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url, title });
        onShared?.();
      } else {
        await navigator.clipboard.writeText(url);
        onShared?.();
      }
    } catch {
      // user canceled or unsupported
    }
  };

  return (
    <button type="button" onClick={share} className={className} aria-label="Share">
      <FaShareAlt style={{ marginRight: 6 }} />
      <span>Share</span>
    </button>
  );
}
