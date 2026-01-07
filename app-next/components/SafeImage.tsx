// app-next/components/SafeImage.tsx
import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type SafeImageProps = Omit<ImageProps, 'src'> & {
  /** Primary image URL (can be null/undefined) */
  src?: string | null;
  /** Fallback used if the primary image 404s or errors */
  fallbackSrc?: string;
};

/**
 * <SafeImage> wraps next/image and:
 * - Accepts possibly broken/null src.
 * - On first load error, swaps to fallbackSrc.
 * - Prevents infinite error loops.
 */
const DEFAULT_FALLBACK = '/images/default-avatar.png';

export default function SafeImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  ...rest
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(
    src || fallbackSrc,
  );
  const [hasErrored, setHasErrored] = useState(false);

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={() => {
        // Already on fallback, avoid loops
        if (hasErrored) return;
        setHasErrored(true);
        setCurrentSrc(fallbackSrc);
      }}
    />
  );
}
