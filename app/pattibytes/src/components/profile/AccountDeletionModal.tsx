/* eslint-disable react/no-unescaped-entities */
// ─────────────────────────────────────────────────────────────────
// 3-step account deletion flow:
// Step 1: Warning — explains what happens
// Step 2: Type "DELETE" to confirm
// Step 3: Submits cancellation request (30-day grace period)
//         Signs out the user immediately
// ─────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { S } from "./profileStyles";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { COLORS } from "../../lib/constants";
import { useRouter } from "expo-router";

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export function AccountDeletionModal({ open, userId, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1);
    setConfirmText("");
    setReason("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitDeletion = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const deletionAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Insert cancellation/deletion request into access_requests
      const { error: reqErr } = await supabase
        .from("access_requests")
        .insert({
          user_id: userId,
          requested_role: "none",
          request_type: "account_deletion",
          status: "pending",
          notes: reason.trim() || "User requested account deletion",
          scheduled_deletion_at: deletionAt,
          cancellation_reason: reason.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (reqErr) throw reqErr;

      // Mark profile as pending deletion
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          account_status: "pending_deletion",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (profErr) throw profErr;

      // Sign out immediately
      await supabase.auth.signOut();

      Alert.alert(
        "Request submitted ✅",
        `Your account is scheduled for deletion on ${new Date(
          deletionAt
        ).toLocaleDateString("en-IN")}.\n\nLog back in before that date to cancel.`,
        [
          {
            text: "OK",
            onPress: () => {
              handleClose();
              router.replace("/(auth)/login" as any);
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit deletion request");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={handleClose}
    >
      <View style={S.modalOverlay}>
        <View style={S.modalCard}>
          {/* ── Step 1: Warning ── */}
          {step === 1 && (
            <>
              <Text style={[S.modalTitle, { color: "#B91C1C" }]}>
                🗑️ Delete Account
              </Text>
              <View style={S.dangerNote}>
                <Text style={S.dangerNoteTxt}>
                  ⚠️ This will schedule your account for permanent deletion in{" "}
                  <Text style={{ fontWeight: "900" }}>30 days</Text>.{"\n\n"}
                  All your orders, addresses, and data will be{" "}
                  <Text style={{ fontWeight: "900" }}>permanently erased</Text>.
                  {"\n\n"}
                  You can cancel this by logging back in within 30 days.
                </Text>
              </View>
              <Text style={S.fieldLbl}>
                Reason for leaving (optional)
              </Text>
              <TextInput
                style={[S.input, { minHeight: 64, textAlignVertical: "top" }]}
                value={reason}
                onChangeText={setReason}
                placeholder="Tell us why you're leaving..."
                multiline
                placeholderTextColor="#9CA3AF"
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  style={[S.btn, S.btnGhost]}
                  onPress={handleClose}
                >
                  <Text style={[S.btnTxt, { color: "#6B7280" }]}>
                    Keep account
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    S.btn,
                    { backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FECACA" },
                  ]}
                  onPress={() => setStep(2)}
                >
                  <Text style={[S.btnTxt, { color: "#B91C1C" }]}>
                    Continue →
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 2: Type DELETE to confirm ── */}
          {step === 2 && (
            <>
              <Text style={[S.modalTitle, { color: "#B91C1C" }]}>
                Confirm deletion
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#4B5563",
                  lineHeight: 20,
                  marginBottom: 12,
                }}
              >
                Type{" "}
                <Text
                  style={{ fontWeight: "900", color: "#B91C1C" }}
                >
                  DELETE
                </Text>{" "}
                in capital letters below to confirm you understand this action
                is irreversible.
              </Text>
              <TextInput
                style={[
                  S.input,
                  { borderColor: confirmText === "DELETE" ? "#10B981" : "#FECACA" },
                ]}
                value={confirmText}
                onChangeText={(v) => setConfirmText(v.toUpperCase())}
                placeholder="Type DELETE here"
                autoCapitalize="characters"
                placeholderTextColor="#9CA3AF"
              />
              {confirmText && confirmText !== "DELETE" && (
                <Text style={S.hintErr}>Type "DELETE" exactly</Text>
              )}
              {confirmText === "DELETE" && (
                <Text style={S.hintOk}>✅ Confirmed</Text>
              )}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  style={[S.btn, S.btnGhost]}
                  onPress={() => setStep(1)}
                >
                  <Text style={[S.btnTxt, { color: "#6B7280" }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    S.btn,
                    S.btnDanger,
                    (confirmText !== "DELETE" || loading) && { opacity: 0.4 },
                  ]}
                  onPress={submitDeletion}
                  disabled={confirmText !== "DELETE" || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[S.btnTxt, { color: "#fff" }]}>
                      🗑️ Delete my account
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}