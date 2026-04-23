export const uploadToStorage = async (file: File, folder: string = 'pattibytes'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
  formData.append('folder', folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw new Error('Failed to upload image');
  }
};

export const uploadPDF = async (file: File): Promise<string> => {
  return uploadToStorage(file, 'pattibytes/menus');
};

export const uploadImage = async (file: File, type: 'profile' | 'menu' | 'banner'): Promise<string> => {
  return uploadToStorage(file, `pattibytes/${type}s`);
};

