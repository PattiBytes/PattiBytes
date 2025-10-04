import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

type Props = Omit<ImageProps, 'loader'> & { 
  fallbackSrc?: string;
};

export default function SafeImage({ 
  src, 
  fallbackSrc = '/images/logo.png', 
  alt,
  ...rest 
}: Props) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      unoptimized={typeof imgSrc === 'string' && imgSrc.startsWith('http')}
    />
  );
}
