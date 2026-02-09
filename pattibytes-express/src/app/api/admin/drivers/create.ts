/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Body = {
  email: string;
  password?: string;
  full_name?: string;
  phone?: string;
};

function genPassword(len = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.status(200).json({ ok: true });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) return res.status(500).json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' });
    if (!serviceKey) return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller is admin/superadmin
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing Authorization token' });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user?.id) return res.status(401).json({ error: 'Invalid session' });

    const callerId = userRes.user.id;

    const { data: callerProfile, error: callerProfileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (callerProfileErr) return res.status(403).json({ error: 'Failed to verify admin' });

    const role = String((callerProfile as any)?.role || '').toLowerCase();
    if (!(role === 'admin' || role === 'superadmin')) return res.status(403).json({ error: 'Forbidden' });

    const body = (req.body || {}) as Partial<Body>;
    const email = String(body.email || '').trim().toLowerCase();
    const full_name = String(body.full_name || '').trim();
    const phone = String(body.phone || '').trim();

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const generated = !String(body.password || '').trim();
    const password = generated ? genPassword(12) : String(body.password).trim();
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const now = new Date().toISOString();

    // Create auth user (Admin API) [web:99]
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createErr) return res.status(400).json({ error: createErr.message });

    const newUserId = created?.user?.id;
    if (!newUserId) return res.status(500).json({ error: 'Auth user not created' });

    // Insert/Upsert profiles
    const { error: pErr } = await admin.from('profiles').upsert(
      {
        id: newUserId,
        email,
        full_name: full_name || null,
        phone: phone || null,
        role: 'driver',

        avatar_url: null,
        approval_status: 'pending',
        is_approved: false,
        profile_completed: false,
        is_active: true,

        cancelled_orders_count: 0,
        is_trusted: false,
        trust_score: 0,
        total_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        last_order_date: null,
        account_status: 'active',

        created_at: now,
        updated_at: now,
      } as any,
      { onConflict: 'id' }
    );

    if (pErr) return res.status(400).json({ error: pErr.message });

    // Insert/Upsert driver_profiles skeleton
    const { error: dErr } = await admin.from('driver_profiles').upsert(
      {
        user_id: newUserId,
        vehicle_type: null,
        vehicle_number: null,
        license_number: null,
        license_expiry: null,

        is_available: false,
        is_verified: false,
        rating: 0,
        total_deliveries: 0,
        earnings: 0,

        aadhar_number: null,
        aadhar_photo: null,
        profile_photo: null,
        vehicle_photo: null,
        license_photo: null,

        profile_completed: false,
        created_at: now,
        updated_at: now,
      } as any,
      { onConflict: 'user_id' }
    );

    if (dErr) return res.status(400).json({ error: dErr.message });

    return res.status(200).json({ id: newUserId, password: generated ? password : null });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
