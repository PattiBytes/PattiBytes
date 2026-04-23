interface ImageLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Cloudinary URLs → transform via Cloudinary's own pipeline (free, zero Vercel credits)
  if (src.includes('res.cloudinary.com')) {
    const q = quality ?? 'auto';
    // Insert transformation params before the upload version segment
    return src.replace('/upload/', `/upload/w_${width},q_${q},f_auto/`);
  }

  // All other URLs (Google avatars, Supabase, Unsplash, etc.) → serve as-is
  // No Vercel transformation = no credit consumption
  return src;
}
