import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError && session) {
      // Get or create profile
      let profile = null;
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError || !existingProfile) {
        // Create profile for Google OAuth users
        const newProfileData = {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name || 
                     session.user.email?.split('@')[0] || 
                     'User',
          phone: session.user.phone || session.user.user_metadata?.phone || '',
          role: 'customer',
          approval_status: 'approved',
          profile_completed: true,
          is_active: true,
          avatar_url: session.user.user_metadata?.avatar_url || 
                     session.user.user_metadata?.picture || 
                     '',
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfileData])
          .select()
          .single();

        if (insertError) {
          console.error('Profile creation error:', insertError);
          return NextResponse.redirect(new URL('/auth/login?error=profile_creation_failed', requestUrl.origin));
        }

        profile = newProfile;
      } else {
        profile = existingProfile;
      }

      // Check if user is banned
      if (!profile.is_active) {
        return NextResponse.redirect(new URL('/auth/login?error=account_suspended', requestUrl.origin));
      }

      // Check approval status for non-customers
      if (['merchant', 'driver', 'admin', 'superadmin'].includes(profile.role)) {
        if (profile.approval_status === 'pending') {
          return NextResponse.redirect(new URL('/auth/pending-approval', requestUrl.origin));
        }
        if (profile.approval_status === 'rejected') {
          return NextResponse.redirect(new URL('/auth/login?error=account_rejected', requestUrl.origin));
        }
      }

      // Check if profile needs completion
      if (!profile.profile_completed) {
        // Redirect to profile completion page
        const completeProfileUrl = profile.role === 'customer' 
          ? `/${profile.role}/dashboard` 
          : `/${profile.role}/profile/complete`;
        return NextResponse.redirect(new URL(completeProfileUrl, requestUrl.origin));
      }

      // All checks passed - redirect to dashboard
      const dashboardUrl = `/${profile.role}/dashboard`;
      return NextResponse.redirect(new URL(dashboardUrl, requestUrl.origin));
    }

    // Session error
    console.error('Session exchange error:', sessionError);
    return NextResponse.redirect(new URL('/auth/login?error=session_failed', requestUrl.origin));
  }

  // No code provided
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}
