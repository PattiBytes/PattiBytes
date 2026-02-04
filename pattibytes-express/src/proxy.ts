import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const path = req.nextUrl.pathname;
  const fullPath = `${req.nextUrl.pathname}${req.nextUrl.search || ''}`;

  // Always-public files/routes (important for SEO + PWA)
  const publicExact = new Set([
    '/',
    '/qr',
    '/sitemap.xml',
    '/robots.txt',
    '/manifest.json',
    '/sw.js',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/auth/forgot-password',
    '/login',
    '/signup',
  ]);

  if (publicExact.has(path) || path.startsWith('/auth/')) {
    return res;
  }

  // Validate auth on the server (prevents the insecure-session warning). [web:534]
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData?.user;

  if (!authUser) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirect', fullPath);
    return NextResponse.redirect(redirectUrl);
  }

  // Profile for role checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status, profile_completed, is_active')
    .eq('id', authUser.id)
    .single();

  if (!profile) return NextResponse.redirect(new URL('/auth/login', req.url));
  if (!profile.is_active) return NextResponse.redirect(new URL('/auth/login?error=account_suspended', req.url));

  if (profile.role === 'superadmin') return res;

  if (['merchant', 'driver', 'admin'].includes(profile.role)) {
    if (profile.approval_status === 'pending' && !path.startsWith('/auth/pending-approval')) {
      return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
    }
    if (profile.approval_status === 'rejected') {
      return NextResponse.redirect(new URL('/auth/login?error=account_rejected', req.url));
    }
  }

  if (!profile.profile_completed && profile.role !== 'customer') {
    const completeProfilePath = `/${profile.role}/profile/complete`;
    if (path !== completeProfilePath) return NextResponse.redirect(new URL(completeProfilePath, req.url));
  }

  if (path.startsWith('/admin/') && !['admin', 'superadmin'].includes(profile.role)) {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }
  if (path.startsWith('/merchant/') && !['merchant', 'superadmin'].includes(profile.role)) {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }
  if (path.startsWith('/driver/') && !['driver', 'superadmin'].includes(profile.role)) {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }
  if (path.startsWith('/customer/') && !['customer', 'superadmin'].includes(profile.role)) {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    // Don’t run auth proxy for Next assets and public files
    '/((?!_next/static|_next/image|sitemap.xml|robots.txt|manifest.json|sw.js|favicon.ico|icon-192.png|icon-512.png).*)',
  ],
};
