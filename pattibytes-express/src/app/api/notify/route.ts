/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ONESIGNAL_URL  = 'https://api.onesignal.com/notifications';
const WEB_PUSH_ROLES = new Set(['admin', 'superadmin', 'merchant', 'driver', 'customer']);
const ADMIN_ROLES    = ['admin', 'superadmin'] as const;

const ALWAYS_FANOUT = new Set([
  'new_order', 'order', 'order_update', 'approval',
  'review', 'payment', 'custom', 'quote', 'complaint', 'refund',
]);

// Sound mapped per notification type — sent as data so the client can play it
const TYPE_SOUND_MAP: Record<string, string> = {
  new_order:    'order',
  order_update: 'notify',
  delivered:    'success',
  approval:     'notify',
  payment:      'success',
  default:      'notify',
};

// ─────────────────────────────────────────────────────────────────────────────
// Deep-link builder
// ─────────────────────────────────────────────────────────────────────────────

function buildDeepLink(
  role: string,
  type: string,
  data?: Record<string, unknown>,
): string {
  const base    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com';
  const orderId = data?.order_id ?? data?.orderId;

  if (orderId) {
    if (ADMIN_ROLES.includes(role as any)) return `${base}/admin/orders/${orderId}`;
    if (role === 'merchant')               return `${base}/merchant/orders/${orderId}`;
    if (role === 'driver')                 return `${base}/driver/orders/${orderId}`;
    return `${base}/customer/orders/${orderId}`;
  }
  if (type === 'approval')               return `${base}/auth/pending-approval`;
  if (ADMIN_ROLES.includes(role as any)) return `${base}/admin/dashboard`;
  if (role === 'merchant')               return `${base}/merchant/dashboard`;
  if (role === 'driver')                 return `${base}/driver/dashboard`;
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// OneSignal push
// ─────────────────────────────────────────────────────────────────────────────

interface OneSignalResult {
  success:    boolean;
  recipients?: number;
  id?:         string;
}

async function sendOneSignal(
  userIds:  string[],
  title:    string,
  body:     string,
  data:     Record<string, unknown>,
  url:      string,
  soundKey: string = 'default',
): Promise<OneSignalResult> {
  const appId  = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const site   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com';

  if (!appId || !apiKey) {
    console.error('[notify] ❌ OneSignal env vars missing');
    return { success: false };
  }
  if (!userIds.length) {
    console.warn('[notify] sendOneSignal: no userIds — skipped');
    return { success: false };
  }

  console.log(`[notify] → OneSignal push | users: ${userIds.length} | title: "${title}"`);

  try {
    const res = await fetch(ONESIGNAL_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id:                        appId,
        target_channel:                'push',
        headings:                      { en: title },
        contents:                      { en: body },
        url,
        data:                          { ...data, sound: soundKey },
        // Android / Web sound (filename without extension in /sounds/)
        android_sound:                 soundKey,
        chrome_web_icon:               `${site}/icon-192.png`,
        chrome_web_badge:              `${site}/icon-192.png`,
        include_aliases:               { external_id: userIds },
        channel_for_external_user_ids: 'push',
        ttl:                           259_200, // 3 days
      }),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[notify] ❌ OneSignal API error:', JSON.stringify(result));
      return { success: false };
    }

    console.log(`[notify] ✅ OneSignal OK — id: ${result?.id} | recipients: ${result?.recipients}`);
    return { success: true, recipients: result?.recipients, id: result?.id };
  } catch (e) {
    console.error('[notify] ❌ OneSignal threw:', e);
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helper — insert one or many notification rows
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(
  userId:    string,
  title:     string,
  message:   string,
  type:      string,
  data:      Record<string, unknown>,
) {
  return {
    user_id:    userId,
    title,
    message,
    body:       message,
    type,
    data,
    is_read:    false,
    sent_push:  false,
    created_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notify
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Env ──────────────────────────────────────────────────────────────────
  const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const INTERNAL_SECRET = process.env.NOTIFY_INTERNAL_SECRET ?? '';

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('[notify] ❌ Missing Supabase env vars');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // ── DB client (service role — bypasses RLS, validates JWTs) ──────────────
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader     = req.headers.get('authorization') ?? '';
  const internalHeader = req.headers.get('x-internal-secret') ?? '';
  const jwt            = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  let callerId: string | null = null;

  if (INTERNAL_SECRET && internalHeader === INTERNAL_SECRET) {
    callerId = 'server-internal';
    console.log('[notify] auth: internal secret ✓');
  } else if (jwt) {
    const { data: { user }, error } = await db.auth.getUser(jwt);
    if (error || !user) {
      console.warn('[notify] ❌ JWT invalid:', error?.message ?? 'no user');
      return NextResponse.json({ error: 'Invalid JWT' }, { status: 401 });
    }
    callerId = user.id;
    console.log('[notify] auth: JWT ✓ user:', callerId);
  } else {
    console.warn('[notify] ❌ No auth header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try   { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const {
    targetUserId,
    title,
    message,
    type,
    data:        rawData    = {},
    url:         overrideUrl,
  } = body as {
    targetUserId: string;
    title:        string;
    message:      string;
    type:         string;
    data?:        Record<string, unknown>;
    url?:         string;
  };

  if (!targetUserId || !title || !message || !type) {
    console.warn('[notify] Missing fields — targetUserId, title, message, type required');
    return NextResponse.json(
      { error: 'Missing required fields: targetUserId, title, message, type' },
      { status: 400 },
    );
  }

  // ── Resolve target role ───────────────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .maybeSingle();

  const targetRole = String(profile?.role ?? 'customer').toLowerCase();
  console.log(`[notify] target: ${targetUserId} | role: ${targetRole} | type: ${type}`);

  // ── Build notification payload ────────────────────────────────────────────
  const soundKey  = TYPE_SOUND_MAP[type] ?? TYPE_SOUND_MAP.default;
  const notifData: Record<string, unknown> = {
    ...(rawData as Record<string, unknown>),
    type,
    sound:    soundKey,                                  // client plays /sounds/{soundKey}.mp3
    order_id: (rawData as any)?.order_id ?? (rawData as any)?.orderId ?? null,
    orderId:  (rawData as any)?.orderId  ?? (rawData as any)?.order_id ?? null,
  };
  const deepLink = (overrideUrl as string | undefined) ?? buildDeepLink(targetRole, type, notifData);
  notifData.url  = deepLink;

  // ── Insert target DB row ──────────────────────────────────────────────────
  const { data: inserted, error: insErr } = await db
    .from('notifications')
    .insert(makeRow(targetUserId, title, message, type, notifData))
    .select('id')
    .single();

  if (insErr) {
    console.error('[notify] ❌ DB insert failed:', insErr.message);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const notifId = (inserted as { id: string }).id;
  console.log('[notify] ✅ target DB row:', notifId);

  // ── OneSignal push → target ───────────────────────────────────────────────
  let sentPush = false;
  if (WEB_PUSH_ROLES.has(targetRole)) {
    const r = await sendOneSignal(
      [targetUserId], title, message,
      { ...notifData, notification_id: notifId },
      deepLink,
      soundKey,
    );
    sentPush = r.success;
    if (sentPush) {
      await db.from('notifications').update({ sent_push: true }).eq('id', notifId);
    }
  }

  // ── Admin fan-out ─────────────────────────────────────────────────────────
  const alreadyForwarded = Boolean((rawData as any)?.forwarded_from);
  const targetIsAdmin    = ADMIN_ROLES.includes(targetRole as any);
  const shouldFanOut     = !alreadyForwarded && !targetIsAdmin && ALWAYS_FANOUT.has(type);

  let adminFanoutCount = 0;

  if (shouldFanOut) {
    console.log(`[notify] Fan-out → admins/superadmins for type: ${type}`);

    const { data: admins } = await db
      .from('profiles')
      .select('id')
      .in('role', [...ADMIN_ROLES])
      .eq('is_active', true);

    if (admins?.length) {
      const adminIds   = admins.map((a: { id: string }) => a.id);
      const adminTitle = `[${targetRole.toUpperCase()}] ${title}`;
      const adminData  = { ...notifData, forwarded_from: targetUserId };
      const adminUrl   = buildDeepLink('admin', type, notifData);

      // Insert all admin rows in one batch
      const { data: adminRows } = await db
        .from('notifications')
        .insert(adminIds.map((id: string) => makeRow(id, adminTitle, message, type, adminData)))
        .select('id');

      adminFanoutCount = adminIds.length;
      console.log(`[notify] ✅ admin DB rows: ${adminFanoutCount}`);

      // OneSignal push → all admins in one call
      const adminPush = await sendOneSignal(
        adminIds, adminTitle, message,
        { ...adminData, notification_id: notifId },
        adminUrl,
        soundKey,
      );

      if (adminPush.success && adminRows?.length) {
        await db
          .from('notifications')
          .update({ sent_push: true })
          .in('id', (adminRows as { id: string }[]).map(r => r.id));
      }
    } else {
      console.warn('[notify] ⚠️ No active admins/superadmins found — check is_active in profiles');
    }
  }

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:                true,
    notification_id:   notifId,
    sent_push:         sentPush,
    role:              targetRole,
    admin_fanout_count: adminFanoutCount,
  });
}
