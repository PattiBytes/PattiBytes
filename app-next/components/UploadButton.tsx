import { useRef, useState } from 'react';
import SafeImage from './SafeImage';
import { FaUpload, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/UploadButton.module.css';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface UploadButtonProps {
  onUploadComplete?: (url: string) => void;
  accept?: string;
  maxSize?: number;
  buttonText?: string;
  showPreview?: boolean;
}

export default function UploadButton({
  onUploadComplete,
  accept = 'image/*',
  maxSize = 10,
  buttonText = 'Upload File',
  showPreview = true,
}: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0); // simulated for Cloudinary
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File must be less than ${maxSize}MB`);
      return;
    }
    if (accept && !file.type.match(accept.replace('*', '.*'))) {
      toast.error('Invalid file type');
      return;
    }

    if (showPreview && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }

    try {
      setUploading(true);
      setProgress(30);

      const url = await uploadToCloudinary(file);

      setProgress(100);
      toast.success('Upload successful!');
      onUploadComplete?.(url);
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      toast.error('Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  const handleRemovePreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.uploadContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {!preview ? (
        <button type="button" onClick={handleButtonClick} disabled={uploading} className={styles.uploadBtn}>
          <FaUpload />
          {uploading ? 'Uploading...' : buttonText}
        </button>
      ) : (
        <div className={styles.previewContainer}>
          <SafeImage src={preview} alt="Preview" width={300} height={200} className={styles.preview} />
          <button type="button" onClick={handleRemovePreview} className={styles.removeBtn} disabled={uploading}>
            <FaTimes />
          </button>
        </div>
      )}

      {uploading && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          <span className={styles.progressText}>{progress}%</span>
        </div>
      )}
    </div>
  );
}
