import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/callback', '/qr', '/auth/forgot-password'];
  
  if (publicRoutes.includes(path) || path.startsWith('/auth/')) {
    return response;
  }

  // Require authentication for all other routes
  if (!session) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status, profile_completed, is_active')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // Check if user is banned
  if (!profile.is_active) {
    return NextResponse.redirect(new URL('/auth/login?error=account_suspended', req.url));
  }

  // Check approval status for non-customers
  if (['merchant', 'driver', 'admin', 'superadmin'].includes(profile.role)) {
    if (profile.approval_status === 'pending' && !path.startsWith('/auth/pending-approval')) {
      return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
    }
    if (profile.approval_status === 'rejected') {
      return NextResponse.redirect(new URL('/auth/login?error=account_rejected', req.url));
    }
  }

  // Check profile completion - redirect to profile/complete if not completed
  if (!profile.profile_completed && profile.role !== 'customer') {
    const completeProfilePath = `/${profile.role}/profile/complete`;
    if (path !== completeProfilePath && !path.startsWith('/auth/')) {
      return NextResponse.redirect(new URL(completeProfilePath, req.url));
    }
    // Allow access to complete profile page
    if (path === completeProfilePath) {
      return response;
    }
  }

  // Role-based route protection
  if (path.startsWith('/admin/') && !['admin', 'superadmin'].includes(profile.role)) {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }

  if (path.startsWith('/merchant/') && profile.role !== 'merchant') {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }

  if (path.startsWith('/driver/') && profile.role !== 'driver') {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }

  if (path.startsWith('/customer/') && profile.role !== 'customer') {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js).*)',
  ],
};
