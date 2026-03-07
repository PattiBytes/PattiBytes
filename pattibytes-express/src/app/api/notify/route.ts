/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';

// ✅ ALL roles get web push — customer was missing and is the primary use case
const WEB_PUSH_ROLES = new Set(['admin', 'superadmin', 'merchant', 'driver', 'customer']);
const ADMIN_ROLES    = ['admin', 'superadmin'];
const ALWAYS_FANOUT  = new Set([
  'new_order', 'order', 'order_update', 'approval',
  'review', 'payment', 'custom', 'quote', 'complaint', 'refund',
]);

function buildDeepLink(role: string, type: string, data?: Record<string, unknown>): string {
  const base    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com';
  const orderId = data?.order_id ?? data?.orderId;
  if (orderId) {
    if (ADMIN_ROLES.includes(role)) return `${base}/admin/orders/${orderId}`;
    if (role === 'merchant')        return `${base}/merchant/orders/${orderId}`;
    if (role === 'driver')          return `${base}/driver/orders/${orderId}`;
    return `${base}/orders/${orderId}`;
  }
  if (type === 'approval')        return `${base}/auth/pending-approval`;
  if (ADMIN_ROLES.includes(role)) return `${base}/admin/dashboard`;
  if (role === 'merchant')        return `${base}/merchant/dashboard`;
  if (role === 'driver')          return `${base}/driver/dashboard`;
  return `${base}/`;
}

async function sendOneSignal(
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
  url: string,
): Promise<{ success: boolean; recipients?: number; id?: string }> {
  const appId  = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.error('[notify] ❌ ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY missing');
    return { success: false };
  }
  if (!userIds.length) return { success: false };

  console.log('[notify] → OneSignal push to:', userIds, '| title:', title);

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com';
    const payload = {
      app_id:         appId,
      target_channel: 'push',
      headings:       { en: title },
      contents:       { en: body },
      url,
      data,
      include_aliases:               { external_id: userIds },
      channel_for_external_user_ids: 'push',
      chrome_web_icon:  `${siteUrl}/icon-192.png`,
      chrome_web_badge: `${siteUrl}/icon-192.png`,
      // ✅ TTL: 3 days — ensures delivery even if browser closed
      ttl: 259200,
    };

    const res = await fetch(ONESIGNAL_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
      body:    JSON.stringify(payload),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[notify] ❌ OneSignal error:', JSON.stringify(result));
      return { success: false };
    }

    console.log('[notify] ✅ OneSignal OK — id:', result?.id, '| recipients:', result?.recipients);
    return { success: true, recipients: result?.recipients, id: result?.id };
  } catch (e) {
    console.error('[notify] ❌ OneSignal threw:', e);
    return { success: false };
  }
}

export async function POST(req: NextRequest) {
  const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const ANON_KEY        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const INTERNAL_SECRET = process.env.NOTIFY_INTERNAL_SECRET ?? '';

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('[notify] ❌ Missing Supabase env vars');
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader     = req.headers.get('authorization') ?? '';
  const internalHeader = req.headers.get('x-internal-secret') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  let callerId: string | null = null;

  if (INTERNAL_SECRET && internalHeader === INTERNAL_SECRET) {
    callerId = 'server-internal';
  } else if (jwt) {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error } = await anonClient.auth.getUser(jwt);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid JWT' }, { status: 401 });
    }
    callerId = user.id;
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[notify] caller:', callerId);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const {
    targetUserId,
    title,
    message,
    type,
    data = {},
    url: overrideUrl,
  } = body as {
    targetUserId: string; title: string; message: string;
    type: string; data?: Record<string, unknown>; url?: string;
  };

  if (!targetUserId || !title || !message || !type) {
    return NextResponse.json({ error: 'Missing required fields: targetUserId, title, message, type' }, { status: 400 });
  }

  // ── Resolve target role ───────────────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', targetUserId).maybeSingle();
  const targetRole = String(profile?.role ?? 'customer').toLowerCase();
  console.log('[notify] target:', targetUserId, '| role:', targetRole, '| type:', type);

  // ── Build notification payload ────────────────────────────────────────────
  const notifData: Record<string, unknown> = {
    ...(data as Record<string, unknown>),
    type,
    orderId:  (data as any)?.orderId  ?? (data as any)?.order_id  ?? null,
    order_id: (data as any)?.order_id ?? (data as any)?.orderId   ?? null,
  };
  const deepLink    = (overrideUrl as string | undefined) ?? buildDeepLink(targetRole, type, notifData);
  notifData.url     = deepLink;

  // ── Insert DB row ─────────────────────────────────────────────────────────
  const { data: inserted, error: insErr } = await db
    .from('notifications')
    .insert({
      user_id:    targetUserId,
      title,
      message,
      body:       message,   // ✅ always populate both fields
      type,
      data:       notifData,
      is_read:    false,
      sent_push:  false,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insErr) {
    console.error('[notify] ❌ DB insert failed:', insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const notifId = (inserted as { id: string }).id;
  console.log('[notify] ✅ DB row:', notifId);

  // ── OneSignal push to target ──────────────────────────────────────────────
  let sentPush = false;
  if (WEB_PUSH_ROLES.has(targetRole)) {
    const r = await sendOneSignal(
      [targetUserId], title, message,
      { ...notifData, notification_id: notifId },
      deepLink
    );
    sentPush = r.success;
  }

  if (sentPush) {
    await db.from('notifications').update({ sent_push: true }).eq('id', notifId);
  }

  // ── Admin fan-out ─────────────────────────────────────────────────────────
  const alreadyForwarded = Boolean((data as any)?.forwarded_from);
  const targetIsAdmin    = ADMIN_ROLES.includes(targetRole);
  const shouldFanOut     =
    !alreadyForwarded &&
    !targetIsAdmin &&
    ALWAYS_FANOUT.has(type);

  if (shouldFanOut) {
    const { data: admins } = await db
      .from('profiles')
      .select('id')
      .in('role', ADMIN_ROLES)
      .eq('is_active', true);

    if (admins?.length) {
      const adminIds   = admins.map((a: { id: string }) => a.id);
      const adminTitle = `[${targetRole.toUpperCase()}] ${title}`;
      const adminData  = { ...notifData, forwarded_from: targetUserId };
      const adminUrl   = buildDeepLink('admin', type, notifData);

      const { data: adminRows } = await db.from('notifications').insert(
        adminIds.map((id: string) => ({
          user_id:    id,
          title:      adminTitle,
          message,
          body:       message,
          type,
          data:       adminData,
          is_read:    false,
          sent_push:  false,
          created_at: new Date().toISOString(),
        }))
      ).select('id');

      console.log('[notify] ✅ Admin rows inserted:', adminIds.length);

      const adminPush = await sendOneSignal(
        adminIds, adminTitle, message,
        { ...adminData, notification_id: notifId },
        adminUrl
      );

      if (adminPush.success && adminRows?.length) {
        const adminRowIds = (adminRows as { id: string }[]).map(r => r.id);
        await db.from('notifications').update({ sent_push: true }).in('id', adminRowIds);
      }
    }
  }

  return NextResponse.json({
    ok:              true,
    notification_id: notifId,
    sent_push:       sentPush,
    role:            targetRole,
  });
}
