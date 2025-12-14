// app-next/pages/api/account/delete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

type DeleteReq = {
  deleteUserContent?: boolean;
};

type DeleteRes =
  | { ok: true }
  | { ok: false; error: string };

function initAdmin() {
  if (admin.apps.length) return;

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FB_PROJECT_ID || // fallback to your existing public project id
    undefined;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env vars');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteRes>,
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    initAdmin();

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : '';
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Missing token' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const body = (req.body || {}) as DeleteReq;

    const db = admin.firestore();

    // Load user doc to get username (for username mapping cleanup)
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    const username = snap.exists ? String(snap.data()?.username || '') : '';

    // Delete username mapping if exists
    if (username) {
      await db.doc(`usernames/${username}`).delete().catch(() => null);
    }

    // Delete user profile doc
    await userRef.delete().catch(() => null);

    // Optionally: delete user content (posts, comments, likes)
    if (body.deleteUserContent) {
      // Example if posts collection has authorId = uid:
      // const postsSnap = await db.collection('posts').where('authorId', '==', uid).get();
      // const batch = db.batch();
      // postsSnap.docs.forEach((d) => batch.delete(d.ref));
      // await batch.commit();
      //
      // Wire more deletes here based on your collections.
    }

    // Finally delete Auth user
    await admin.auth().deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    console.error('Delete account API error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return res.status(500).json({ ok: false, error: message });
  }
}
