import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
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
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: req.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: req.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const path = req.nextUrl.pathname;

  // ── Public routes — no auth needed ──────────────────────────────────────
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/qr',
    '/auth/forgot-password',
  ];

  if (
    publicRoutes.includes(path) ||
    path.startsWith('/auth/') ||
    path.startsWith('/legal/')
  ) {
    return response;
  }

  // ── Verify session securely with the Auth server ─────────────────────────
  // ✅ getUser() contacts Supabase Auth to cryptographically verify the JWT.
  //    getSession() only reads the cookie and can be forged — never use it
  //    for access control on protected/admin routes.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }

  // ── Fetch profile ────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status, profile_completed, is_active')
    .eq('id', user.id)   // ✅ user.id from verified getUser(), not session
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // ── Account suspended / banned ───────────────────────────────────────────
  if (!profile.is_active) {
    return NextResponse.redirect(
      new URL('/auth/login?error=account_suspended', req.url)
    );
  }

  // ── Superadmin bypasses all further checks ───────────────────────────────
  if (profile.role === 'superadmin') {
    return response;
  }

  // ── Approval checks (merchant / driver / admin) ──────────────────────────
  if (['merchant', 'driver', 'admin'].includes(profile.role)) {
    if (
      profile.approval_status === 'pending' &&
      !path.startsWith('/auth/pending-approval')
    ) {
      return NextResponse.redirect(
        new URL('/auth/pending-approval', req.url)
      );
    }
    if (profile.approval_status === 'rejected') {
      return NextResponse.redirect(
        new URL('/auth/login?error=account_rejected', req.url)
      );
    }
  }

  // ── Profile completion check ─────────────────────────────────────────────
  if (!profile.profile_completed && profile.role !== 'customer') {
    const completeProfilePath = `/${profile.role}/profile/complete`;
    if (path !== completeProfilePath && !path.startsWith('/auth/')) {
      return NextResponse.redirect(new URL(completeProfilePath, req.url));
    }
    if (path === completeProfilePath) {
      return response;
    }
  }

  // ── Role-based route guards ──────────────────────────────────────────────
  if (
    path.startsWith('/admin/') &&
    !['admin', 'superadmin'].includes(profile.role)
  ) {
    return NextResponse.redirect(
      new URL(`/${profile.role}/dashboard`, req.url)
    );
  }

  if (
    path.startsWith('/merchant/') &&
    profile.role !== 'merchant' &&
    profile.role !== 'superadmin'
  ) {
    return NextResponse.redirect(
      new URL(`/${profile.role}/dashboard`, req.url)
    );
  }

  if (
    path.startsWith('/driver/') &&
    profile.role !== 'driver' &&
    profile.role !== 'superadmin'
  ) {
    return NextResponse.redirect(
      new URL(`/${profile.role}/dashboard`, req.url)
    );
  }

  if (
    path.startsWith('/customer/') &&
    profile.role !== 'customer' &&
    profile.role !== 'superadmin'
  ) {
    return NextResponse.redirect(
      new URL(`/${profile.role}/dashboard`, req.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js).*)',
  ],
};