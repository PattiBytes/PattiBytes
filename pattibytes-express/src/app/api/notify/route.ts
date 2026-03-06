import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const ONESIGNAL_URL = 'https://api.onesignal.com/notifications';
const WEB_ROLES     = new Set(['admin', 'superadmin', 'merchant', 'driver']);
const ADMIN_ROLES   = ['admin', 'superadmin'];
const ALWAYS_FANOUT = new Set([
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
  if (type === 'approval')          return `${base}/auth/pending-approval`;
  if (ADMIN_ROLES.includes(role))   return `${base}/admin/dashboard`;
  if (role === 'merchant')          return `${base}/merchant/dashboard`;
  if (role === 'driver')            return `${base}/driver/dashboard`;
  return `${base}/`;
}

async function sendOneSignal(
  userIds: string[], title: string, body: string,
  data: Record<string, unknown>, url: string
): Promise<boolean> {
  const appId  = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  // ✅ Log env var presence — tells you immediately if they're missing
  if (!appId || !apiKey) {
    console.error('[notify] ❌ ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set');
    return false;
  }
  if (!userIds.length) { console.warn('[notify] sendOneSignal: no userIds'); return false; }

  console.log('[notify] Sending OneSignal push to:', userIds, '| title:', title);

  try {
    const payload = {
      app_id:          appId,
      target_channel:  'push',
      headings:        { en: title },
      contents:        { en: body },
      url,
      data,
      include_aliases: { external_id: userIds },
      channel_for_external_user_ids: 'push',
      chrome_web_icon:  `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com'}/icon-192.png`,
      chrome_web_badge: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com'}/icon-192.png`,
    };

    const res = await fetch(ONESIGNAL_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${apiKey}` },
      body:    JSON.stringify(payload),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[notify] ❌ OneSignal API error:', JSON.stringify(result));
      return false;
    }
    console.log('[notify] ✅ OneSignal accepted push. id:', result?.id, '| recipients:', result?.recipients);
    return true;
  } catch (e) {
    console.error('[notify] ❌ OneSignal fetch threw:', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // ✅ Internal secret — allows server-side code to call without user JWT
  const INTERNAL_SECRET = process.env.NOTIFY_INTERNAL_SECRET ?? '';

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('[notify] ❌ Missing Supabase env vars');
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
  }

  // ── Auth: accept JWT OR internal secret ───────────────────────────────────
  const authHeader     = req.headers.get('authorization') ?? '';
  const internalHeader = req.headers.get('x-internal-secret') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  let callerId: string | null = null;

  if (INTERNAL_SECRET && internalHeader === INTERNAL_SECRET) {
    // ✅ Called from server-side Next.js code — trusted
    callerId = 'server-internal';
    console.log('[notify] called via internal secret');
  } else if (jwt) {
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error } = await anonClient.auth.getUser(jwt);
    if (error || !user) {
      console.warn('[notify] Invalid JWT:', error?.message);
      return NextResponse.json({ error: 'Invalid JWT' }, { status: 401 });
    }
    callerId = user.id;
    console.log('[notify] called by user:', callerId);
  } else {
    console.warn('[notify] No auth header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { targetUserId, title, message, type, data = {}, url: overrideUrl } = body as {
    targetUserId: string; title: string; message: string;
    type: string; data?: Record<string, unknown>; url?: string;
  };

  if (!targetUserId || !title || !message || !type) {
    console.warn('[notify] Missing fields:', { targetUserId: !!targetUserId, title: !!title, message: !!message, type: !!type });
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Get target role
  const { data: profile } = await db
    .from('profiles').select('role').eq('id', targetUserId).maybeSingle();
  const targetRole = String(profile?.role ?? 'customer').toLowerCase();
  console.log('[notify] target:', targetUserId, '| role:', targetRole, '| type:', type);

  // Build notification data
  const notifData: Record<string, unknown> = {
    ...(data as Record<string, unknown>), type,
    orderId:  (data as Record<string, unknown>)?.orderId  ?? (data as Record<string, unknown>)?.order_id ?? null,
    order_id: (data as Record<string, unknown>)?.orderId  ?? (data as Record<string, unknown>)?.order_id ?? null,
  };
  const deepLink = (overrideUrl as string | undefined) ?? buildDeepLink(targetRole, type, notifData);
  notifData.url  = deepLink;

  // Insert DB row
  const { data: inserted, error: insErr } = await db
    .from('notifications')
    .insert({
      user_id: targetUserId, title, message,
      body: message, type, data: notifData,
      is_read: false, sent_push: false,
      created_at: new Date().toISOString(),
    })
    .select('id').single();

  if (insErr) {
    console.error('[notify] ❌ DB insert failed:', insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const notifId  = (inserted as { id: string }).id;
  let   sentPush = false;
  console.log('[notify] ✅ DB row inserted:', notifId);

  // Send push to target
  if (WEB_ROLES.has(targetRole)) {
    sentPush = await sendOneSignal(
      [targetUserId], title, message,
      { ...notifData, notification_id: notifId }, deepLink
    );
  }
  // Mobile customers → handled by send-push-notification webhook automatically

  if (sentPush) {
    await db.from('notifications').update({ sent_push: true }).eq('id', notifId);
  }

  // Admin fan-out
  const alreadyForwarded = Boolean((data as Record<string, unknown>)?.forwarded_from);
  const targetIsAdmin    = ADMIN_ROLES.includes(targetRole);
  const shouldFanOut     =
    !alreadyForwarded && !targetIsAdmin &&
    (['customer', 'merchant', 'driver'].includes(targetRole) || ALWAYS_FANOUT.has(type));

  if (shouldFanOut) {
    console.log('[notify] Fan-out to admins for type:', type);
    const { data: admins } = await db
      .from('profiles').select('id').in('role', ADMIN_ROLES).eq('is_active', true);

    if (admins?.length) {
      const adminIds   = admins.map((a: { id: string }) => a.id);
      const adminTitle = `[${targetRole.toUpperCase()}] ${title}`;
      const adminData  = { ...notifData, forwarded_from: targetUserId };
      const adminUrl   = buildDeepLink('admin', type, notifData);

      await db.from('notifications').insert(
        adminIds.map((id: string) => ({
          user_id: id, title: adminTitle, message,
          body: message, type, data: adminData,
          is_read: false, sent_push: false,
          created_at: new Date().toISOString(),
        }))
      );
      console.log('[notify] ✅ Admin rows inserted for:', adminIds);

      const adminPushed = await sendOneSignal(
        adminIds, adminTitle, message,
        { ...adminData, notification_id: notifId }, adminUrl
      );

      if (adminPushed) {
        await db.from('notifications')
          .update({ sent_push: true })
          .in('user_id', adminIds).eq('sent_push', false).eq('type', type);
      }
    }
  }

  return NextResponse.json({ ok: true, notification_id: notifId, sent_push: sentPush });
}
