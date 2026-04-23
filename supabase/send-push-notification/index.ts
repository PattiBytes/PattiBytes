import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type NotifRecord = {
  id: string;
  user_id: string;
  title: string | null;
  message: string | null;
  body: string | null;
  type: string | null;
  data: any;
};
type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: NotifRecord;
};
type PushToken = { expo_push_token: string };
type ExpoMessage = {
  to: string; sound: string; title: string;
  body: string; data: object; channelId: string;
};

function parseData(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object") return v;
  try { return JSON.parse(String(v)); } catch { return {}; }
}

// ── OneSignal push via REST API ───────────────────────────────────────────────
async function sendOneSignalPush(params: {
  externalUserId: string;   // Supabase user UUID stored as external_id in OneSignal
  title: string;
  body: string;
  data: Record<string, any>;
  imageUrl?: string;
  webUrl?: string;
  appId: string;
  restKey: string;
}): Promise<{ ok: boolean; recipients?: number; error?: string }> {
  const { externalUserId, title, body, data, imageUrl, webUrl, appId, restKey } = params;

  const payload: Record<string, any> = {
    app_id:           appId,
    // Target by external_id = Supabase user UUID
    // This hits ALL devices + web browsers the user subscribed on
    include_aliases:  { external_id: [externalUserId] },
    target_channel:   "push",
    headings:         { en: title },
    contents:         { en: body },
    data:             { ...data, notificationId: params.data.notificationId },
    priority:         10,
    // Android channel
    android_channel_id: data.type === "promo" ? "promotions" : "orders",
  };

  if (imageUrl) payload.big_picture = imageUrl;
  if (webUrl)   payload.url = webUrl;

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${restKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.errors?.length) {
      console.warn("[OneSignal] errors:", JSON.stringify(json.errors));
      return { ok: false, error: JSON.stringify(json.errors) };
    }
    return { ok: true, recipients: json.recipients ?? 0 };
  } catch (e: any) {
    console.warn("[OneSignal] fetch error:", e?.message);
    return { ok: false, error: e?.message };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const payload = await req.json() as WebhookPayload;
  if (payload.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OS_APP_ID     = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  const OS_REST_KEY   = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";

  const sb  = createClient(SUPABASE_URL, SERVICE_ROLE);
  const rec = payload.record;

  const d        = parseData(rec.data);
  const orderId  = d.orderId ?? d.order_id ?? null;
  const channelId =
    rec.type === "order" || rec.type === "new_order" || rec.type === "order_update"
      ? "orders"
      : rec.type === "promo"
      ? "promotions"
      : "default";

  const title = rec.title ?? "PBExpress";
  const body  = rec.body ?? rec.message ?? "You have a new notification";
  const data  = {
    ...d,
    type:           rec.type ?? "general",
    orderId,
    order_id:       orderId,
    notificationId: rec.id,
  };

  // ── 1. Expo push ─────────────────────────────────────────────────────────
  const { data: tokens, error: tErr } = await sb
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", rec.user_id)
    .eq("is_active", true);

  let expoSent = 0;
  let badTokens: string[] = [];

  if (!tErr && tokens?.length) {
    const messages: ExpoMessage[] = (tokens as PushToken[]).map((t) => ({
      to:        t.expo_push_token,
      sound:     "default",
      title,
      body,
      data,
      channelId,
    }));

    try {
      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method:  "POST",
        headers: {
          "Content-Type":    "application/json",
          "Accept":          "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });
      const result = await expoRes.json();
      expoSent = messages.length;
      console.log("[expo] result:", JSON.stringify(result));

      // Clean up DeviceNotRegistered tokens
      const tickets = Array.isArray(result?.data) ? result.data : [];
      badTokens = tickets
        .map((t: any, i: number) =>
          t?.status === "error" && t?.details?.error === "DeviceNotRegistered"
            ? (tokens as PushToken[])[i]?.expo_push_token
            : null
        )
        .filter(Boolean) as string[];

      if (badTokens.length > 0) {
        await sb.from("push_tokens").delete().in("expo_push_token", badTokens);
        console.log("[expo] Removed stale tokens:", badTokens);
      }
    } catch (e: any) {
      console.error("[expo] send failed:", e?.message);
    }
  }

  // ── 2. OneSignal push (web + mobile) ─────────────────────────────────────
  let osSent = 0;
  let osError: string | undefined;

  if (OS_APP_ID && OS_REST_KEY) {
    const webUrl = orderId
      ? `https://pbexpress.pattibytes.com/customer/orders/${orderId}`
      : "https://pbexpress.pattibytes.com";

    const osResult = await sendOneSignalPush({
      externalUserId: rec.user_id,
      title,
      body,
      data,
      webUrl,
      appId:   OS_APP_ID,
      restKey: OS_REST_KEY,
    });
    osSent   = osResult.recipients ?? 0;
    osError  = osResult.error;
    console.log(`[OneSignal] ok:${osResult.ok} recipients:${osSent}`);
  } else {
    console.warn("[OneSignal] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set — skipping web push");
  }

  // ── 3. Mark sent_push = true ──────────────────────────────────────────────
  const anySent = expoSent > 0 || osSent > 0;
  if (anySent) {
    const { error: updateErr } = await sb
      .from("notifications")
      .update({ sent_push: true })
      .eq("id", rec.id);
    if (updateErr) console.warn("[push] sent_push update failed:", updateErr.message);
  }

  return new Response(
    JSON.stringify({
      ok:        true,
      expo_sent: expoSent,
      os_sent:   osSent,
      os_error:  osError ?? null,
      bad_tokens: badTokens,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});