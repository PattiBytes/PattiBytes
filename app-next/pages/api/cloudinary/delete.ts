import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { publicId } = req.body as { publicId?: string };
  if (!publicId) return res.status(400).json({ error: 'publicId is required' });

  try {
    const cloudName = getEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    const apiKey = getEnv('CLOUDINARY_API_KEY');
    const apiSecret = getEnv('CLOUDINARY_API_SECRET');

    // Cloudinary deletion signature
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const form = new URLSearchParams();
    form.append('public_id', publicId);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);

    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: form,
    });

    const json = await resp.json();
    if (!resp.ok || json.result !== 'ok') {
      return res.status(400).json({ error: json.error?.message || 'Cloudinary delete failed' });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Cloudinary delete API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
