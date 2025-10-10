import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'node:crypto';

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function detectResourceType(publicId: string, hint?: 'image' | 'video'): 'image' | 'video' {
  if (hint) return hint;
  if (/\bvideos?\b/.test(publicId) || /\.(mp4|webm|mov)$/i.test(publicId)) return 'video';
  return 'image';
}

type CloudinaryDestroyOK = { result?: string };
type CloudinaryDestroyError = { error?: { message?: string } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { publicId, resourceType } = req.body as { publicId?: string; resourceType?: 'image' | 'video' };
  if (!publicId) return res.status(400).json({ error: 'publicId is required' });

  try {
    const cloudName = getEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
    const apiKey = getEnv('CLOUDINARY_API_KEY');
    const apiSecret = getEnv('CLOUDINARY_API_SECRET');

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const form = new URLSearchParams();
    form.set('public_id', publicId);
    form.set('timestamp', String(timestamp));
    form.set('api_key', apiKey);
    form.set('signature', signature);

    const rType = detectResourceType(publicId, resourceType);
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${rType}/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const json = (await resp.json().catch(() => ({}))) as CloudinaryDestroyOK & CloudinaryDestroyError;

    if (!resp.ok || (json.result && json.result !== 'ok')) {
      const msg = json.error?.message || `Cloudinary delete failed (${resp.status})`;
      return res.status(400).json({ error: msg });
    }

    return res.status(200).json({ ok: true, result: json.result || 'ok' });
  } catch (err) {
    const e = err instanceof Error ? err : new Error('Unknown error');
    console.error('Cloudinary delete API error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
