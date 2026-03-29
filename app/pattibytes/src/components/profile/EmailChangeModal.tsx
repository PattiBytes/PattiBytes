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

interface Props {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
}

export function EmailChangeModal({ open, currentEmail, onClose }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    if (email === currentEmail.toLowerCase()) {
      Alert.alert("Same email", "This is already your current email.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      Alert.alert(
        "Verification sent ✅",
        `A link was sent to ${email}. Your email changes after you click it.`,
        [
          {
            text: "OK",
            onPress: () => {
              setNewEmail("");
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send verification");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={onClose}
    >
      <View style={S.modalOverlay}>
        <View style={S.modalCard}>
          <Text style={S.modalTitle}>Change Email</Text>
          <View style={S.emailNote}>
            <Text style={S.emailNoteTxt}>
              ℹ️ A verification link will be sent to your NEW email. Your
              address only changes after you click the link.
            </Text>
          </View>
          <Text style={S.fieldLbl}>New email address</Text>
          <TextInput
            style={S.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="new@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor="#9CA3AF"
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <TouchableOpacity
              style={[S.btn, S.btnGhost]}
              onPress={onClose}
              disabled={sending}
            >
              <Text style={[S.btnTxt, { color: "#6B7280" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btn, S.btnPrimary, sending && { opacity: 0.7 }]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[S.btnTxt, { color: "#fff" }]}>Send link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}