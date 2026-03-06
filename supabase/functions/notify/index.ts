import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// eslint-disable-next-line
import { createClient } from "@supabase/supabase-js";

type NotifyBody = {
  targetUserId: string;
  title: string;
  message: string;
  body?: string;
  type: string;
  data?: Record<string, unknown>;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ONESIGNAL_URL = "https://api.onesignal.com/notifications";

// ✅ ALL web users get OneSignal push (driver added — they use web app too)
const WEB_ROLES  = new Set(["admin", "superadmin", "merchant", "driver"]);
const ADMIN_ROLES = ["admin", "superadmin"];

// ✅ These notification types ALWAYS fan-out to admins regardless of target role
const ALWAYS_NOTIFY_ADMIN_TYPES = new Set([
  "new_order",
  "order",
  "order_update",
  "approval",
  "review",
  "payment",
  "custom",
  "quote",
  "complaint",
  "refund",
]);

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── Send OneSignal push to one or many users ──────────────────────────────────
async function sendOneSignalPush(
  osAppId: string,
  osApiKey: string,
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
  iconUrl = "/icon-192.png"
): Promise<boolean> {
  if (!osAppId || !osApiKey || userIds.length === 0) return false;
  try {
    const res = await fetch(ONESIGNAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${osApiKey}`,
      },
      body: JSON.stringify({
        app_id:         osAppId,
        target_channel: "push",
        headings:       { en: title },
        contents:       { en: body },
        data,
        // ✅ url field enables click-to-navigate when app is closed
        url: data?.url
          ? String(data.url)
          : `https://${Deno.env.get("NEXT_PUBLIC_SITE_HOST") ?? "pbexpress.pattibytes.com"}`,
        include_aliases: { external_id: userIds },
        channel_for_external_user_ids: "push",
        chrome_web_icon:  iconUrl,
        chrome_web_badge: iconUrl,
        // ✅ Required for push to work when app/tab is CLOSED
        // OneSignal will wake the SW which calls OneSignalSDKWorker.js
        web_push_topic: data?.type ? String(data.type) : "general",
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("[notify] OneSignal error:", JSON.stringify(err));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[notify] OneSignal fetch failed:", e);
    return false;
  }
}

// ── Send Expo push to mobile tokens ──────────────────────────────────────────
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<boolean> {
  if (tokens.length === 0) return false;
  try {
    const messages = tokens.map(to => ({
      to, title, body, sound: "default", channelId: "default", data,
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("[notify] Expo push error:", JSON.stringify(err));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[notify] Expo fetch failed:", e);
    return false;
  }
}

// ── Insert notification rows in bulk ─────────────────────────────────────────
async function insertNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  userIds: string[],
  title: string,
  message: string,
  body: string,
  type: string,
  data: Record<string, unknown>,
  sentPush = false
) {
  const rows = userIds.map(id => ({
    user_id:    id,
    title,
    message,
    body,
    type,
    data,
    is_read:    false,
    sent_push:  sentPush,
    created_at: new Date().toISOString(),
  }));
  const { error } = await adminClient.from("notifications").insert(rows);
  if (error) console.error("[notify] insertNotifications error:", error.message);
}

// ── Main ──────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" },
    });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const OS_APP_ID    = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  const OS_API_KEY   = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
    return json(500, { error: "Missing Supabase env vars" });
  }

  // ── 1. Verify caller JWT ──────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json(401, { error: "Missing Bearer token" });

  const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(401, { error: "Invalid JWT" });

  // ── 2. Admin client (bypass RLS) ──────────────────────────────────────────
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: callerProfile, error: profErr } = await adminClient
    .from("profiles")
    .select("id, role, is_active, approval_status")
    .eq("id", userData.user.id)
    .single();

  if (profErr || !callerProfile) return json(403, { error: "Profile not found" });

  const callerRole = String(callerProfile.role ?? "").toLowerCase();
  const isActive   = Boolean(callerProfile.is_active);
  const isApproved = String(callerProfile.approval_status ?? "").toLowerCase() === "approved";

  // ✅ Added "driver" — drivers need to send delivery update notifications
  const allowedRoles = ["admin", "superadmin", "merchant", "driver"];
  if (!isActive || !isApproved || !allowedRoles.includes(callerRole)) {
    return json(403, { error: "Not allowed" });
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let input: NotifyBody;
  try { input = (await req.json()) as NotifyBody; }
  catch { return json(400, { error: "Invalid JSON" }); }

  const { targetUserId, title, message, body, type, data } = input;
  if (!targetUserId || !title || !message || !type) {
    return json(400, { error: "Missing required fields: targetUserId, title, message, type" });
  }

  // ── 4. Get target profile ─────────────────────────────────────────────────
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", targetUserId)
    .maybeSingle();

  const targetRole = String(targetProfile?.role ?? "customer").toLowerCase();

  // ── 5. Build payload ──────────────────────────────────────────────────────
  const notifData: Record<string, unknown> = {
    ...(data ?? {}),
    type,
    orderId:  (data as Record<string, unknown>)?.orderId  ?? (data as Record<string, unknown>)?.order_id ?? null,
    order_id: (data as Record<string, unknown>)?.orderId  ?? (data as Record<string, unknown>)?.order_id ?? null,
    // ✅ url drives click-to-navigate when push is tapped while app is closed
    url: (data as Record<string, unknown>)?.url ?? buildUrl(targetRole, type, data),
  };

  const bodyText = body ?? message;

  // ── 6. Insert notification for target user ────────────────────────────────
  const { data: inserted, error: insErr } = await adminClient
    .from("notifications")
    .insert({
      user_id:    targetUserId,
      title,
      message,
      body:       bodyText,
      type,
      data:       notifData,
      is_read:    false,
      sent_push:  false,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr) return json(500, { error: insErr.message });
  const notifId = (inserted as { id: string })?.id;
  let sentPush  = false;

  // ── 7. Send push to target user ───────────────────────────────────────────
  if (WEB_ROLES.has(targetRole)) {
    // Web push via OneSignal (works when app/tab CLOSED — SW handles it)
    sentPush = await sendOneSignalPush(
      OS_APP_ID, OS_API_KEY,
      [targetUserId], title, bodyText,
      { ...notifData, notification_id: notifId }
    );
  } else {
    // Mobile push via Expo for customers
    const { data: tokens } = await adminClient
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", targetUserId)
      .eq("is_active", true);

    if (tokens?.length) {
      sentPush = await sendExpoPush(
        tokens.map((t: { expo_push_token: string }) => t.expo_push_token),
        title, bodyText,
        { ...notifData, notification_id: notifId }
      );
    }
  }

  // Update sent_push flag
  if (notifId && sentPush) {
    await adminClient.from("notifications").update({ sent_push: true }).eq("id", notifId);
  }

  // ── 8. Fan-out to admins/superadmins ──────────────────────────────────────
  // ✅ Fixed: fan-out for customer + merchant + driver (was missing driver)
  // ✅ Fixed: also fan-out for important types regardless of target role
  // ✅ Fixed: skip fan-out if target IS already admin (they already got the notif)
  // ✅ Fixed: skip if this is already a forwarded notif (no infinite loops)
  const alreadyForwarded = Boolean((data as Record<string, unknown>)?.forwarded_from);
  const targetIsAdmin    = ADMIN_ROLES.includes(targetRole);
  const shouldFanOut     =
    !alreadyForwarded &&
    !targetIsAdmin &&
    (["customer", "merchant", "driver"].includes(targetRole) ||
     ALWAYS_NOTIFY_ADMIN_TYPES.has(type));

  if (shouldFanOut) {
    const { data: adminUsers } = await adminClient
      .from("profiles")
      .select("id")
      .in("role", ADMIN_ROLES)
      .eq("is_active", true);

    if (adminUsers && adminUsers.length > 0) {
      const adminIds   = adminUsers.map((u: { id: string }) => u.id);
      const adminTitle = `[${targetRole.toUpperCase()}] ${title}`;
      const adminData  = { ...notifData, forwarded_from: targetUserId };

      // ✅ Awaited — we now know if admin DB insert succeeded
      await insertNotifications(
        adminClient, adminIds,
        adminTitle, message, bodyText, type,
        adminData
      );

      // OneSignal push to all admins — works when their browser is closed too
      const adminPushed = await sendOneSignalPush(
        OS_APP_ID, OS_API_KEY,
        adminIds, adminTitle, bodyText,
        { ...adminData, notification_id: notifId },
      );

      if (adminPushed) {
        // Mark admin notification rows as push-sent
        await adminClient
          .from("notifications")
          .update({ sent_push: true })
          .in("user_id", adminIds)
          .eq("sent_push", false)
          .eq("type", type);
      }
    }
  }

  return json(200, { ok: true, notification_id: notifId, sent_push: sentPush });
});

// ── URL builder for push click navigation ────────────────────────────────────
function buildUrl(
  role: string,
  type: string,
  data?: Record<string, unknown>
): string {
  const base   = `https://${Deno.env.get("NEXT_PUBLIC_SITE_HOST") ?? "pbexpress.pattibytes.com"}`;
  const orderId = data?.order_id ?? data?.orderId;

  if (orderId) {
    if (ADMIN_ROLES.includes(role)) return `${base}/admin/orders/${orderId}`;
    if (role === "merchant")        return `${base}/merchant/orders/${orderId}`;
    if (role === "driver")          return `${base}/driver/orders/${orderId}`;
    return `${base}/orders/${orderId}`;
  }
  if (type === "approval")          return `${base}/auth/pending-approval`;
  if (role === "admin" || role === "superadmin") return `${base}/admin/dashboard`;
  if (role === "merchant")          return `${base}/merchant/dashboard`;
  if (role === "driver")            return `${base}/driver/dashboard`;
  return `${base}/`;
}
