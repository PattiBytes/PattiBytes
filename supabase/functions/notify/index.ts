import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// eslint-disable-next-line
import { createClient } from "@supabase/supabase-js";


type NotifyBody = {
  targetUserId: string;
  title: string;
  message: string;
  type: "order" | "promo" | "general";
  data?: Record<string, unknown>;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) {
    return json(500, { error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" });
  }

  // 1) Verify caller JWT
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json(401, { error: "Missing Bearer token" });

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) return json(401, { error: "Invalid JWT" });

  // 2) Admin client (bypass RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: callerProfile, error: profErr } = await admin
    .from("profiles")
    .select("id, role, is_active, approval_status")
    .eq("id", caller.id)
    .single();

  if (profErr || !callerProfile) return json(403, { error: "Profile not found" });

  const role = String(callerProfile.role || "").toLowerCase();
  const active = Boolean(callerProfile.is_active);
  const approved = String(callerProfile.approval_status || "").toLowerCase() === "approved";

  // allow admin/superadmin/merchant (you asked this)
  if (!active || !approved || !["admin", "superadmin", "merchant"].includes(role)) {
    return json(403, { error: "Not allowed" });
  }

  // 3) Parse request
  let input: NotifyBody;
  try {
    input = (await req.json()) as NotifyBody;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { targetUserId, title, message, type, data } = input;
  if (!targetUserId || !title || !message || !type) {
    return json(400, { error: "Missing fields" });
  }

  // 4) Insert into notifications (webhook will push)
  const payloadData = {
    ...(data ?? {}),
    type: type === "order" ? "order_update" : type,
    // if you pass order_id/orderId inside data, keep it
    orderId: (data as any)?.orderId ?? (data as any)?.order_id ?? null,
    order_id: (data as any)?.orderId ?? (data as any)?.order_id ?? null,
  };

  const { error: insErr } = await admin.from("notifications").insert({
    user_id: targetUserId,
    title,
    message,
    body: message,   // keep body for push UI
    type,            // your column type: "order"/"promo"/"general"
    data: payloadData,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  if (insErr) return json(500, { error: insErr.message });

  return json(200, { ok: true });
});
