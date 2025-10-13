// app-next/pages/api/cloudinary/upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 200 * 1024 * 1024, // 200MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = fileArray[0];
    const type = fields.type?.[0] || 'image';

    // Determine resource type
    const resourceType = type === 'video' ? 'video' : 'image';

    // Upload to Cloudinary with signed request
    const result = await cloudinary.uploader.upload(file.filepath, {
      resource_type: resourceType,
      folder: type === 'avatar' ? 'avatars' : type === 'video' ? 'videos' : 'images',
      transformation:
        resourceType === 'image'
          ? [{ quality: 'auto:good' }, { fetch_format: 'auto' }]
          : undefined,
    });

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return res.status(500).json({ error: message });
  }
}
