import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookieStore).get(name)?.value;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async set(name: string, value: string, options: any) {
            (await cookieStore).set({ name, value, ...options });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async remove(name: string, options: any) {
            (await cookieStore).set({ name, value: '', ...options });
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'customer') {
        return NextResponse.redirect(new URL('/customer/dashboard', requestUrl.origin));
      } else if (profile?.role === 'merchant') {
        return NextResponse.redirect(new URL('/merchant/dashboard', requestUrl.origin));
      } else if (profile?.role === 'driver') {
        return NextResponse.redirect(new URL('/driver/dashboard', requestUrl.origin));
      } else if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        return NextResponse.redirect(new URL('/admin/dashboard', requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}
