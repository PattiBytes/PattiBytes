export default function cloudinaryLoader({ src, width, quality }) {
  // If already a Cloudinary URL, transform via Cloudinary's own pipeline
  if (src.includes('res.cloudinary.com')) {
    return src.replace('/upload/', `/upload/w_${width},q_${quality || 'auto'},f_auto/`);
  }
  return src;
}