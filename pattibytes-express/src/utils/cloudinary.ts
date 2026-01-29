export const uploadToCloudinary = async (
  file: File,
  folder: string = 'pattibytes'
): Promise<string> => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary not configured. Please add credentials to .env.local');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw new Error('Failed to upload file');
  }
};

export const uploadImage = async (
  file: File,
  type: 'profile' | 'menu' | 'banner'
): Promise<string> => {
  return uploadToCloudinary(file, `pattibytes/${type}s`);
};

export const uploadPDF = async (file: File): Promise<string> => {
  return uploadToCloudinary(file, 'pattibytes/menus');
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  // This requires server-side implementation with your API secret
  // For now, we'll just log
  console.log('Delete image:', publicId);
};
