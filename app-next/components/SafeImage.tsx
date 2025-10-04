import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

type SafeImageProps = Omit<ImageProps, 'src' | 'loader'> & {
  src: string | null | undefined;
  fallbackSrc?: string;
};

export default function SafeImage({
  src,
  fallbackSrc = '/images/logo.png',
  alt,
  ...rest
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  // Always use unoptimized for external URLs to avoid loader issues
  const isExternal = imgSrc.startsWith('http');

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      unoptimized={isExternal}
      loader={isExternal ? ({ src }) => src : undefined}
    />
  );
}
