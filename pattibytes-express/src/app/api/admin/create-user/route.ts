// Server-side user creation using service role key — never disrupts current session
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  // Verify caller is superadmin
  const cookieStore = await cookies();
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if caller is superadmin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: superadmin only' }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, full_name, phone, role, city, state, username } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!['admin', 'superadmin'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Create auth user (service role = skip email verification)
  const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone, role },
  });

  if (createErr || !authData.user) {
    return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 400 });
  }

  const uid = authData.user.id;

  // Wait for trigger, then upsert profile
  await new Promise((r) => setTimeout(r, 1500));

  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: uid,
      email,
      full_name,
      phone: phone || null,
      role,
      approval_status: 'approved',
      profile_completed: true,
      is_active: true,
      is_approved: true,
      city: city || null,
      state: state || null,
      username: username || null,
      updated_at: new Date().toISOString(),
    });

  if (profileErr) {
    // Rollback auth user if profile fails
    await supabaseAdmin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: uid });
}
