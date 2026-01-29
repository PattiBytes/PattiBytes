/* eslint-disable @typescript-eslint/no-explicit-any */

export const uploadToCloudinary = async (
  file: File,
  folder: string = 'general'
): Promise<string> => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Image size should be less than 5MB');
    }

    // Check environment variables
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error('Cloudinary config missing:', { cloudName, uploadPreset });
      throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        errorData.error?.message || 
        `Upload failed with status ${response.status}`
      );
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      console.error('No secure_url in response:', data);
      throw new Error('Upload succeeded but no URL was returned');
    }

    return data.secure_url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', {
      message: error?.message || String(error),
      name: error?.name,
      stack: error?.stack,
    });
    
    // Return user-friendly error message
    if (error.message.includes('5MB')) {
      throw error;
    }
    if (error.message.includes('image file')) {
      throw error;
    }
    if (error.message.includes('configuration')) {
      throw error;
    }
    
    throw new Error('Failed to upload image. Please try again.');
  }
};

// Delete image from Cloudinary (optional)
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!cloudName) {
      throw new Error('Cloudinary configuration is missing');
    }

    // Note: For production, you should use a secure backend endpoint
    // that uses your API secret to delete images
    console.log('Delete image with publicId:', publicId);
    
    // This is a placeholder - implement backend deletion for security
  } catch (error: any) {
    console.error('Cloudinary delete error:', error?.message || String(error));
    throw error;
  }
};
