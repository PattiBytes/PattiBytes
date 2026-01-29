import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Add this to your .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, merchantData } = body;

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: merchantData.business_name,
        role: 'merchant',
      },
    });

    if (authError) throw authError;

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: merchantData.business_name,
        phone: merchantData.phone,
        role: 'merchant',
        approval_status: 'approved',
        is_active: true,
      });

    if (profileError) throw profileError;

    // 3. Create merchant
    const { error: merchantError } = await supabaseAdmin
      .from('merchants')
      .insert({
        owner_id: authData.user.id,
        business_name: merchantData.business_name,
        email,
        phone: merchantData.phone,
        address: merchantData.address,
        cuisine_type: merchantData.cuisine_type,
        description: merchantData.description,
        is_active: true,
        is_verified: true,
      });

    if (merchantError) throw merchantError;

    return NextResponse.json({
      success: true,
      credentials: { email, password },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating merchant:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
