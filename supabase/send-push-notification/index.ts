// supabase/functions/send-push-notification/index.ts
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

Deno.serve(async (req: Request) => {
  // Only process POST webhooks on INSERT
  const payload = await req.json() as WebhookPayload;
  if (payload.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const rec = payload.record;

  // ── Fetch tokens from push_tokens (FIXED table name) ──
  const { data: tokens, error: tErr } = await sb
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", rec.user_id);

  if (tErr) {
    console.error("[push] Token query error:", tErr.message);
    return new Response(JSON.stringify({ ok: false, error: tErr.message }), { status: 200 });
  }
  if (!tokens?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_tokens" }), { status: 200 });
  }

  // ── Build push data ──
  const d = parseData(rec.data);
  const orderId = d.orderId ?? d.order_id ?? null;
  const channelId =
    rec.type === "order" ? "orders"
    : rec.type === "promo" ? "promotions"
    : "default";

  const messages: ExpoMessage[] = (tokens as PushToken[]).map((t) => ({
    to: t.expo_push_token,
    sound: "default",
    title: rec.title ?? "PBExpress",
    body: rec.body ?? rec.message ?? "You have a new notification",
    data: {
      ...d,
      type: rec.type ?? "general",
      orderId,
      order_id: orderId,
      notificationId: rec.id,
    },
    channelId,
  }));

  // ── Send to Expo Push API ──
  let result: any = null;
  try {
    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
    result = await expoRes.json();
    console.log("[push] Expo result:", JSON.stringify(result));
  } catch (e: any) {
    console.error("[push] Expo send failed:", e?.message);
    return new Response(JSON.stringify({ ok: false, error: e?.message }), { status: 200 });
  }

  // ── Mark sent_push = true ──
  const { error: updateErr } = await sb
    .from("notifications")
    .update({ sent_push: true })
    .eq("id", rec.id);
  if (updateErr) console.warn("[push] sent_push update failed:", updateErr.message);

  // ── Handle ticket errors (invalid tokens) ──
  const tickets = Array.isArray(result?.data) ? result.data : [];
  const badTokens = tickets
    .map((t: any, i: number) =>
      t?.status === "error" && t?.details?.error === "DeviceNotRegistered"
        ? (tokens as PushToken[])[i]?.expo_push_token
        : null
    )
    .filter(Boolean);

  if (badTokens.length > 0) {
    console.log("[push] Removing stale tokens:", badTokens);
    await sb.from("push_tokens").delete().in("expo_push_token", badTokens);
  }

  return new Response(
    JSON.stringify({ ok: true, sent: messages.length, result }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
