/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      business_name,
      business_type,
      cuisine_types,
      description,
      logo_url,
      banner_url,
      phone,
      email,
      latitude,
      longitude,
      is_active,
      is_verified,
      delivery_radius_km,
      min_order_amount,
      estimated_prep_time,
      commission_rate,
      address,
      city,
      state,
      postal_code,
      gst_enabled,
      gst_percentage,
      password, // optional
    } = body || {};

    if (!business_name || !email || !phone) {
      return NextResponse.json({ error: 'business_name, email, phone are required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: requester, error: requesterErr } = await userClient.auth.getUser();
    if (requesterErr || !requester?.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data: requesterProfile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', requester.user.id)
      .single();

    const requesterRole = String((requesterProfile as any)?.role || '');
    if (!['admin', 'superadmin'].includes(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const generatedPassword =
      password ||
      Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: business_name, phone },
    });

    if (createErr || !created?.user?.id) {
      return NextResponse.json({ error: createErr?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const newUserId = created.user.id;

    await adminClient.from('profiles').upsert({
      id: newUserId,
      email,
      full_name: business_name,
      phone,
      role: 'merchant',
      approval_status: 'approved',
      profile_completed: true,
      is_active: true,
      is_approved: true,
      updated_at: new Date().toISOString(),
    });

    const { data: merchantRow, error: merchantErr } = await adminClient
      .from('merchants')
      .insert([
        {
          user_id: newUserId,
          business_name,
          business_type: business_type || 'restaurant',
          cuisine_types: cuisine_types || [],
          description: description || null,
          logo_url: logo_url || null,
          banner_url: banner_url || null,
          phone,
          email,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          is_active: is_active ?? true,
          is_verified: is_verified ?? true,
          average_rating: 0,
          total_reviews: 0,
          delivery_radius_km: delivery_radius_km ?? 5,
          min_order_amount: min_order_amount ?? 100,
          estimated_prep_time: estimated_prep_time ?? 30,
          commission_rate: commission_rate ?? 10,
          address: address ?? null,
          city: city ?? null,
          state: state ?? null,
          postal_code: postal_code ?? null,
          gst_enabled: gst_enabled ?? false,
          gst_percentage: gst_percentage ?? 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (merchantErr) return NextResponse.json({ error: merchantErr.message }, { status: 400 });

    return NextResponse.json({
      user_id: newUserId,
      merchant: merchantRow,
      credentials: { email, password: generatedPassword },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
