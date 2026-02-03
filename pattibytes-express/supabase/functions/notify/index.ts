import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type NotifyBody = {
  targetUserId: string;
  title: string;
  message: string;
  type: string;
  data?: unknown;
  body?: string;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Supabase provides these by default in Edge Functions env
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL"); // default [web:86]
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY"); // default [web:86]
  const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY"); // custom secret you set

  if (!SUPABASE_URL || !ANON_KEY) {
    return json(500, { error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY in function env" });
  }
  if (!SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing SERVICE_ROLE_KEY secret (set via `supabase secrets set SERVICE_ROLE_KEY=...`)" });
  }

  // 1) Verify caller JWT
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json(401, { error: "Missing Bearer token" });

  const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  const caller = userData?.user;
  if (userErr || !caller) return json(401, { error: "Invalid JWT" });

  // 2) Admin client (bypass RLS for role checks + fanout insert)
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerProfile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_active, approval_status")
    .eq("id", caller.id)
    .single();

  if (profErr || !callerProfile) return json(403, { error: "Profile not found" });

  const role = String(callerProfile.role || "").toLowerCase();
  const active = Boolean(callerProfile.is_active);
  const approved = String(callerProfile.approval_status || "").toLowerCase() === "approved";

  if (!active || !approved || (role !== "admin" && role !== "superadmin")) {
    return json(403, { error: "Not allowed" });
  }

  // 3) Parse request body
  let input: NotifyBody;
  try {
    input = (await req.json()) as NotifyBody;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { targetUserId, title, message, type, data, body } = input;
  if (!targetUserId || !title || !message || !type) {
    return json(400, { error: "Missing fields" });
  }

  // 4) Fetch recipients (admins + superadmins + target)
  const { data: admins, error: adminErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("role", ["admin", "superadmin"])
    .eq("is_active", true)
    .eq("approval_status", "approved");

  if (adminErr) return json(500, { error: adminErr.message });

  const adminIds = (admins ?? []).map((a: { id: string }) => a.id);
  const recipientIds = Array.from(new Set([targetUserId, ...adminIds]));

  // 5) Fanout insert via SQL RPC you created
  const { error: rpcErr } = await supabaseAdmin.rpc("create_notification_fanout", {
    p_recipient_ids: recipientIds,
    p_title: title,
    p_message: message,
    p_body: body ?? message,
    p_type: type,
    p_data: data ?? {},
  });

  if (rpcErr) return json(500, { error: rpcErr.message });

  return json(200, { ok: true, recipients: recipientIds.length });
});
