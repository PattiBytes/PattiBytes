import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { S } from "./profileStyles";
import { COLORS } from "../../lib/constants";
import type { AddressRow } from "./types";
import type { NormalizedAddress } from "./helpers";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: NormalizedAddress | null;
  onSave: (payload: Partial<AddressRow>) => Promise<void>;
}

export function AddressEditorModal({ open, onClose, initial, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState<string>("Home");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [apartmentFloor, setApartmentFloor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  useEffect(() => {
    if (!open) return;
    setLabel(initial?.label ?? "Home");
    setRecipientName(initial?.recipientName ?? "");
    setRecipientPhone(initial?.recipientPhone ?? "");
    setAddress(initial?.address ?? "");
    setApartmentFloor(initial?.apartmentFloor ?? "");
    setLandmark(initial?.landmark ?? "");
    setPostalCode(initial?.postalCode ?? "");
    setDeliveryInstructions(initial?.deliveryInstructions ?? "");
  }, [open, initial]);

  const handleSave = async () => {
    if (!recipientName.trim()) {
      Alert.alert("Required", "Enter recipient name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(recipientPhone)) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit Indian mobile.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Required", "Enter a full address.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        label: label.trim() || "Home",
        recipient_name: recipientName.trim() || null,
        recipient_phone: recipientPhone.trim() || null,
        address: address.trim(),
        apartment_floor: apartmentFloor.trim() || null,
        landmark: landmark.trim() || null,
        postal_code: postalCode.trim() || null,
        delivery_instructions: deliveryInstructions.trim() || null,
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={open}
      onRequestClose={onClose}
    >
      <View style={S.modalOverlay}>
        <ScrollView
          style={{ width: "100%" }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>
              {initial ? "Edit Address" : "Add Address"}
            </Text>

            <Text style={S.fieldLbl}>Label</Text>
            <View style={S.labelRow}>
              {(["Home", "Work", "Other"] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLabel(l)}
                  style={[S.labelChip, label === l && S.labelChipActive]}
                >
                  <Text style={{ fontSize: 18 }}>
                    {l === "Home" ? "🏠" : l === "Work" ? "💼" : "📍"}
                  </Text>
                  <Text
                    style={[
                      S.labelChipTxt,
                      { color: label === l ? COLORS.primary : "#6B7280" },
                    ]}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={S.fieldLbl}>Recipient name *</Text>
            <TextInput
              style={S.input}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Full name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Recipient phone *</Text>
            <TextInput
              style={S.input}
              value={recipientPhone}
              onChangeText={(v) =>
                setRecipientPhone(v.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Full address *</Text>
            <TextInput
              style={[S.input, { minHeight: 72, textAlignVertical: "top" }]}
              value={address}
              onChangeText={setAddress}
              placeholder="House no., street, area"
              multiline
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Apartment / Floor</Text>
            <TextInput
              style={S.input}
              value={apartmentFloor}
              onChangeText={setApartmentFloor}
              placeholder="Flat 202, 2nd Floor"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Landmark</Text>
            <TextInput
              style={S.input}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Near City Mall"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Pincode</Text>
            <TextInput
              style={S.input}
              value={postalCode}
              onChangeText={(v) =>
                setPostalCode(v.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit pincode"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Delivery instructions</Text>
            <TextInput
              style={[S.input, { minHeight: 60, textAlignVertical: "top" }]}
              value={deliveryInstructions}
              onChangeText={setDeliveryInstructions}
              placeholder="Ring bell twice, leave at door..."
              multiline
              placeholderTextColor="#9CA3AF"
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={[S.btn, S.btnGhost]}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={[S.btnTxt, { color: "#6B7280" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.btn, S.btnPrimary, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[S.btnTxt, { color: "#fff" }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}