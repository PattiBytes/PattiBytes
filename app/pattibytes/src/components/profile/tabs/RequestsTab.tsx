import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { S } from "../profileStyles";
import { Section } from "../Section";
import { Pill } from "../Pill";
import { supabase } from "../../../lib/supabase";
import { COLORS } from "../../../lib/constants";

interface AccessRequest {
  id: string;
  requested_role: string;
  request_type: string;
  status: string;
  notes: string | null;
  scheduled_deletion_at: string | null;
  created_at: string;
}

interface Props {
  userId: string;
}

export function RequestsTab({ userId }: Props) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_requests")
      .select("id,requested_role,request_type,status,notes,scheduled_deletion_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setRequests((data ?? []) as AccessRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const submitRoleRequest = async (role: "merchant" | "driver") => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("access_requests").insert({
        user_id: userId,
        requested_role: role,
        request_type: "role_upgrade",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      Alert.alert(
        "Request submitted ✅",
        "Your role upgrade request has been submitted. Our team will review it shortly."
      );
      await loadRequests();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelDeletion = async () => {
    Alert.alert(
      "Cancel deletion?",
      "This will restore your account to active status.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel deletion",
          onPress: async () => {
            try {
              await supabase
                .from("access_requests")
                .update({
                  status: "rejected",
                  notes: "Cancelled by user",
                  reviewed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
                .eq("request_type", "account_deletion")
                .eq("status", "pending");

              await supabase
                .from("profiles")
                .update({
                  account_status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

              Alert.alert("Done ✅", "Account deletion cancelled.");
              await loadRequests();
            } catch (e: any) {
              Alert.alert("Error", e?.message);
            }
          },
        },
      ]
    );
  };

  const statusTone = (s: string) =>
    s === "approved"
      ? ("good" as const)
      : s === "rejected"
      ? ("bad" as const)
      : ("warn" as const);

  const hasPendingDeletion = requests.some(
    (r) => r.request_type === "account_deletion" && r.status === "pending"
  );

  return (
    <>
      <Section title="Role upgrade requests">
        <Text style={{ color: "#6B7280", lineHeight: 18, marginBottom: 8 }}>
          Request to upgrade your role to Merchant or Delivery Driver. Our team
          reviews within 24–48 hours.
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[S.btn, S.btnPrimary, submitting && { opacity: 0.6 }]}
            onPress={() => submitRoleRequest("merchant")}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[S.btnTxt, { color: "#fff" }]}>
                🏪 Become Merchant
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              S.btn,
              { backgroundColor: "#EEF2FF", borderWidth: 1.5, borderColor: "#C7D2FE" },
              submitting && { opacity: 0.6 },
            ]}
            onPress={() => submitRoleRequest("driver")}
            disabled={submitting}
          >
            <Text style={[S.btnTxt, { color: "#4338CA" }]}>
              🛵 Become Driver
            </Text>
          </TouchableOpacity>
        </View>
      </Section>

      {hasPendingDeletion && (
        <Section title="Pending account deletion">
          <View style={S.dangerNote}>
            <Text style={S.dangerNoteTxt}>
              ⚠️ Your account is scheduled for deletion. You can cancel this
              before the deletion date.
            </Text>
          </View>
          <TouchableOpacity
            style={[S.bigBtn, { marginTop: 10 }]}
            onPress={cancelDeletion}
          >
            <Text style={S.bigBtnTxt}>↩️ Cancel account deletion</Text>
          </TouchableOpacity>
        </Section>
      )}

      <Section title="Request history">
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : requests.length === 0 ? (
          <Text style={{ color: "#9CA3AF", fontWeight: "700" }}>
            No requests yet.
          </Text>
        ) : (
          requests.map((r) => (
            <View
              key={r.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#F8F9FA",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={{ fontWeight: "800", fontSize: 13, flex: 1 }}>
                  {r.request_type === "account_deletion"
                    ? "🗑️ Account deletion"
                    : r.request_type === "role_upgrade"
                    ? `🔼 Role: ${r.requested_role}`
                    : r.request_type}
                </Text>
                <Pill text={r.status.toUpperCase()} tone={statusTone(r.status)} />
              </View>
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                {new Date(r.created_at).toLocaleDateString("en-IN")}
                {r.scheduled_deletion_at
                  ? ` · Deletion: ${new Date(
                      r.scheduled_deletion_at
                    ).toLocaleDateString("en-IN")}`
                  : ""}
              </Text>
              {r.notes ? (
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {r.notes}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </Section>
    </>
  );
}