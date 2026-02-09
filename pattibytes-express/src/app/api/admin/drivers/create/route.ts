/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  email: string;
  password?: string;            // optional (auto-generate if missing)
  full_name?: string;
  phone?: string;
};

function jsonError(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function genPassword(len = 12) {
  // Strong-ish random, avoids confusing chars
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function GET() {
  // quick sanity check in browser: /api/admin/drivers/create should return 200 now
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) return jsonError('Missing NEXT_PUBLIC_SUPABASE_URL', 500);
    if (!serviceKey) return jsonError('Missing SUPABASE_SERVICE_ROLE_KEY', 500);

    // Server-only admin client (service_role key)
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify caller is admin/superadmin using the access token sent from UI
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return jsonError('Missing Authorization token', 401);

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user?.id) return jsonError('Invalid session', 401);

    const callerId = userRes.user.id;

    const { data: callerProfile, error: callerProfileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (callerProfileErr) return jsonError('Failed to verify admin', 403);

    const role = String((callerProfile as any)?.role || '').toLowerCase();
    if (!(role === 'admin' || role === 'superadmin')) return jsonError('Forbidden', 403);

    // Read body
    const body = (await req.json()) as Partial<Body>;
    const email = String(body.email || '').trim().toLowerCase();
    const full_name = String(body.full_name || '').trim();
    const phone = String(body.phone || '').trim();

    if (!email) return jsonError('Email is required', 400);

    // Auto-generate password if not provided
    const passwordFromClient = String(body.password || '').trim();
    const generated = !passwordFromClient;
    const password = generated ? genPassword(12) : passwordFromClient;

    if (!password || password.length < 6) {
      return jsonError('Password must be at least 6 characters', 400);
    }

    const now = new Date().toISOString();

    // Create auth user (server-side only) [web:99]
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createErr) return jsonError(createErr.message, 400);

    const newUserId = created?.user?.id;
    if (!newUserId) return jsonError('Auth user not created', 500);

    // Insert/Upsert profiles row
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

    if (pErr) return jsonError(pErr.message, 400);

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

    if (dErr) return jsonError(dErr.message, 400);

    // Return password only if it was generated (so admin can copy it)
    return NextResponse.json({ id: newUserId, password: generated ? password : null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
