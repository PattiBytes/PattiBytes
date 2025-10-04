// components/SafeImage.tsx
import Image, { ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'loader'> & { fallbackSrc?: string };

export default function SafeImage({ src, fallbackSrc = '/images/logo.png', ...rest }: Props) {
  // Use unoptimized and a passthrough loader to bypass domain checks if necessary
  // This is a guard for dev/HMR or misconfig; keep it until config is stable everywhere.
  return (
    <Image
      {...rest}
      src={typeof src === 'string' && src.length > 0 ? src : fallbackSrc}
      loader={({ src: s }) => s}
      unoptimized
      onError={(e) => {
        // Fallback to local logo on error
        const img = e.currentTarget as HTMLImageElement;
        img.src = fallbackSrc;
      }}
    />
  );
}
