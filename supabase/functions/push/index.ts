import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// eslint-disable-next-line
import { createClient } from "@supabase/supabase-js";


type NotificationRecord = {
  id: string;
  user_id: string;
  title: string | null;
  message: string | null;
  body: string | null;
  type: string | null; // "order" | "promo" | ...
  data: any;           // jsonb can arrive as object or string
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRecord;
  old_record: NotificationRecord | null;
};

type PushTokenRow = { expo_push_token: string };

function safeJsonParse(v: any) {
  if (!v) return {};
  if (typeof v === "object") return v;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return {};
}

function buildPushData(record: NotificationRecord) {
  const data = safeJsonParse(record.data);

  // ensure keys exist for routing
  const orderId = data.orderId ?? data.order_id ?? null;

  return {
    ...data,
    // force standard keys your app listens for
    type: data.type ?? (record.type === "order" ? "order_update" : record.type ?? "general"),
    orderId,
    order_id: orderId,
    notificationId: record.id,
  };
}

Deno.serve(async (req: Request) => {
  const payload = (await req.json()) as WebhookPayload;

  if (payload.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const rec = payload.record;

  // Fetch tokens for this user
  const { data: tokens, error } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", rec.user_id);

  if (error) {
    console.error("[push] token query error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  if (!tokens?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no tokens" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const channelId =
    rec.type === "order" ? "orders" :
    rec.type === "promo" ? "promotions" : "default";

  const title = rec.title ?? "Update";
  const body = rec.body ?? rec.message ?? "You have a new notification";
  const data = buildPushData(rec);

  const messages = (tokens as PushTokenRow[]).map((t) => ({
    to: t.expo_push_token,
    sound: "default",
    title,
    body,
    data,
    channelId,
  }));

  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await expoRes.json();
  console.log("[push] expo result:", JSON.stringify(result));

  return new Response(JSON.stringify({ ok: true, sent: messages.length, result }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
