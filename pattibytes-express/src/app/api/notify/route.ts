import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const ONESIGNAL_URL  = 'https://api.onesignal.com/notifications';
const WEB_ROLES      = new Set(['admin', 'superadmin', 'merchant', 'driver']);
const ADMIN_ROLES    = ['admin', 'superadmin'];
const ALWAYS_FANOUT  = new Set([
  'new_order', 'order', 'order_update', 'approval',
  'review', 'payment', 'custom', 'quote', 'complaint', 'refund',
]);

function buildDeepLink(role: string, type: string, data?: Record<string, unknown>): string {
  const base    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com';
  const orderId = data?.order_id ?? data?.orderId;
  if (orderId) {
    if (ADMIN_ROLES.includes(role))   return `${base}/admin/orders/${orderId}`;
    if (role === 'merchant')          return `${base}/merchant/orders/${orderId}`;
    if (role === 'driver')            return `${base}/driver/orders/${orderId}`;
    return `${base}/orders/${orderId}`;
  }
  if (type === 'approval')            return `${base}/auth/pending-approval`;
  if (ADMIN_ROLES.includes(role))     return `${base}/admin/dashboard`;
  if (role === 'merchant')            return `${base}/merchant/dashboard`;
  if (role === 'driver')              return `${base}/driver/dashboard`;
  return `${base}/`;
}

async function sendOneSignal(
  userIds: string[], title: string, body: string,
  data: Record<string, unknown>, url: string
): Promise<boolean> {
  const appId  = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey || !userIds.length) return false;
  try {
    const res = await fetch(ONESIGNAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
      body: JSON.stringify({
        app_id:          appId,
        target_channel:  'push',
        headings:        { en: title },
        contents:        { en: body },
        url,
        data,
        include_aliases: { external_id: userIds },
        channel_for_external_user_ids: 'push',
        chrome_web_icon:  '/icon-192.png',
        chrome_web_badge: '/icon-192.png',
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      console.error('[notify/api] OneSignal error:', JSON.stringify(e));
    }
    return res.ok;
  } catch (e) {
    console.error('[notify/api] OneSignal fetch failed:', e);
    return false;
  }
}


export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
    }

    // ── 1. Verify caller JWT (any authenticated user can trigger notifications) ──
    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Invalid JWT' }, { status: 401 });

    // ── 2. Use service role for all DB ops (bypasses RLS) ─────────────────────
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const { targetUserId, title, message, type, data = {}, url: overrideUrl } = body;
    if (!targetUserId || !title || !message || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // ── 3. Get target user role ────────────────────────────────────────────────
    const { data: profile } = await db
      .from('profiles').select('role').eq('id', targetUserId).maybeSingle();
    const targetRole = String(profile?.role ?? 'customer').toLowerCase();

    // ── 4. Build payload ───────────────────────────────────────────────────────
    const notifData: Record<string, unknown> = {
      ...data, type,
      orderId:  data.orderId  ?? data.order_id ?? null,
      order_id: data.orderId  ?? data.order_id ?? null,
      url: overrideUrl ?? buildDeepLink(targetRole, type, data),
    };

    // ── 5. Insert notification for target ──────────────────────────────────────
    const { data: inserted, error: insErr } = await db
      .from('notifications')
      .insert({
        user_id:    targetUserId,
        title, message,
        body:       message,
        type,
        data:       notifData,
        is_read:    false,
        sent_push:  false,
        created_at: new Date().toISOString(),
      })
      .select('id').single();

    if (insErr) {
      console.error('[notify/api] DB insert failed:', insErr.message);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const notifId  = (inserted as { id: string }).id;
    let   sentPush = false;

   // ── 6. Send push to target ────────────────────────────────────────────────
// Web roles → OneSignal (browser push, works when closed)
// Mobile customers → webhook `send-push-notification` handles Expo automatically
if (WEB_ROLES.has(targetRole)) {
  sentPush = await sendOneSignal(
    [targetUserId], title, message,
    { ...notifData, notification_id: notifId },
    notifData.url as string
  );
  // ✅ No Expo here — webhook fires on INSERT and handles it
}
// No else branch needed — webhook covers everyone with expo tokens


    // ── 7. Admin fan-out ──────────────────────────────────────────────────────
    const alreadyForwarded = Boolean(data?.forwarded_from);
    const targetIsAdmin    = ADMIN_ROLES.includes(targetRole);
    const shouldFanOut     =
      !alreadyForwarded &&
      !targetIsAdmin &&
      (
        ['customer', 'merchant', 'driver'].includes(targetRole) ||
        ALWAYS_FANOUT.has(type)
      );

    if (shouldFanOut) {
      const { data: admins } = await db
        .from('profiles').select('id')
        .in('role', ADMIN_ROLES).eq('is_active', true);

      if (admins?.length) {
        const adminIds    = admins.map((a: { id: string }) => a.id);
        const adminTitle  = `[${targetRole.toUpperCase()}] ${title}`;
        const adminData   = { ...notifData, forwarded_from: targetUserId };
        const adminUrl    = buildDeepLink('admin', type, data);

        // Insert admin notification rows
        await db.from('notifications').insert(
          adminIds.map((id: string) => ({
            user_id: id, title: adminTitle, message,
            body: message, type, data: adminData,
            is_read: false, sent_push: false,
            created_at: new Date().toISOString(),
          }))
        );

        // Push to all admins (works even when browser is closed)
        const adminPushed = await sendOneSignal(
          adminIds, adminTitle, message,
          { ...adminData, notification_id: notifId },
          adminUrl
        );

        if (adminPushed) {
          await db.from('notifications')
            .update({ sent_push: true })
            .in('user_id', adminIds)
            .eq('sent_push', false)
            .eq('type', type);
        }
      }
    }

    return NextResponse.json({ ok: true, notification_id: notifId, sent_push: sentPush });
  } catch (e: unknown) {
    console.error('[notify/api] unhandled error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
