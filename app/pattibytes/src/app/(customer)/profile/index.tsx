 
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, RefreshControl,
  Image, Platform, Modal, Switch,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { COLORS } from "../../../lib/constants";

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
type TabKey = "profile" | "addresses" | "notifications" | "security" | "requests";

type NotificationPrefs = {
  promos: boolean;
  system: boolean;
  order_updates: boolean;
};

/** Add `username` so setProfile/setForm don't mismatch */
type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;          // ← added
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
  approval_status: string | null;
  profile_completed: boolean | null;
  is_active: boolean | null;
  account_status: string | null;
  trust_score: number | null;
  is_trusted: boolean | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  total_orders: number | null;
  completed_orders: number | null;
  cancelled_orders: number | null;
  cancelled_orders_count: number | null;
  last_order_date: string | null;
  last_seen_at: string | null;
  notification_prefs: any;
};

type AddressRow = {
  id: string;
  customer_id?: string | null;
  label: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address: string | null;
  apartment_floor?: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  postal_code?: string | null;
  is_default?: boolean | null;
  delivery_instructions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type NormalizedAddress = ReturnType<typeof normalizeAddress>;

type Stats = { total: number; completed: number; cancelled: number; totalSpent: number };

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
function safeNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function safeBool(v: any, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}
function parsePrefs(v: any): NotificationPrefs {
  const base: NotificationPrefs = { promos: true, system: true, order_updates: true };
  if (!v) return base;
  if (typeof v === "object") return { ...base, ...v };
  if (typeof v === "string") {
    try { const o = JSON.parse(v); if (o && typeof o === "object") return { ...base, ...o }; } catch {}
  }
  return base;
}
function normalizeAddress(a: AddressRow) {
  return {
    id: String(a.id),
    label: (a.label ?? "Address").trim(),
    recipientName: String(a.recipient_name ?? "").trim() || null,
    recipientPhone: String(a.recipient_phone ?? "").trim() || null,
    address: (a.address ?? "").trim(),
    apartmentFloor: String(a.apartment_floor ?? "").trim() || null,
    landmark: (a.landmark ?? "").trim() || null,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postalCode: String(a.postal_code ?? "").trim() || null,
    isDefault: safeBool((a as any).is_default, false),
    deliveryInstructions: String(a.delivery_instructions ?? "").trim() || null,
    createdAt: a.created_at ?? null,
    updatedAt: a.updated_at ?? null,
  };
}
function moneyINR(n: any) {
  const x = safeNum(n, 0);
  try { return `₹${Math.round(x).toLocaleString("en-IN")}`; } catch { return `₹${Math.round(x)}`; }
}

/** Try Supabase Storage first (bucket: avatars), fallback to Cloudinary */
async function uploadAvatar(userId: string, uri: string): Promise<string> {
  // ── Supabase Storage (preferred if bucket exists) ──
  try {
    const ext = (uri.split(".").pop() ?? "jpg").toLowerCase().replace(/\?.*/, "");
    const path = `avatars/${userId}_${Date.now()}.${ext}`;
    const blob = await fetch(uri).then((r) => r.blob());
    const { error } = await supabase.storage.from("avatars").upload(path, blob, {
      upsert: true,
      contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (storageErr: any) {
    console.warn("[avatar] Supabase storage failed, trying Cloudinary:", storageErr?.message);
  }
  // ── Cloudinary fallback ──
  const cloudName = (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "").trim();
  const preset = (process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "").trim();
  if (!cloudName || !preset) throw new Error("No upload method available (Supabase bucket missing, Cloudinary not configured)");
  const ext = (uri.split(".").pop() ?? "jpg").toLowerCase().replace(/\?.*/, "");
  const form = new FormData();
  form.append("file", { uri, type: `image/${ext}`, name: `avatar.${ext}` } as any);
  form.append("upload_preset", preset);
  form.append("folder", "avatars");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST", body: form,
  });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const json = await res.json();
  return json.secure_url as string;
}

// ═══════════════════════════════════════════════════
// STYLES — MUST come BEFORE any component that uses S
// (fixes all "Block-scoped variable S used before declaration" TS errors)
// ═══════════════════════════════════════════════════
const S = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },

  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 48, paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: "#fff" },
  avatarPlaceholder: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  cameraBtn: {
    position: "absolute", right: 0, bottom: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  heroName: { fontSize: 22, fontWeight: "900", color: "#fff", marginTop: 6 },
  heroUsername: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  heroEmail: { fontSize: 13, color: "rgba(255,255,255,0.82)", marginTop: 2 },

  pillRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  pill: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillTxt: { fontSize: 11, fontWeight: "900" },

  trustBarWrap: { width: "86%", marginTop: 12 },
  trustBarBg: { height: 10, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  trustBarFill: { height: 10, backgroundColor: "#fff" },
  trustTxt: { marginTop: 6, fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.85)", textAlign: "center" },

  statsRow: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 12,
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statDivider: { borderRightWidth: 1, borderRightColor: "#F3F4F6" },
  statVal: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  statLbl: { fontSize: 10, color: "#9CA3AF", fontWeight: "700", marginTop: 2 },

  tabRow: {
    flexDirection: "row", gap: 4,
    marginHorizontal: 16, marginTop: 10,
    padding: 6, backgroundColor: "#fff",
    borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6",
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center", backgroundColor: "#F9FAFB" },
  tabBtnActive: { backgroundColor: "#FFF3EE", borderWidth: 1.5, borderColor: "#FED7AA" },
  tabTxt: { fontSize: 9, fontWeight: "800", color: "#6B7280", marginTop: 2 },
  tabTxtActive: { color: COLORS.primary },

  section: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 10,
    borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: COLORS.text },
  linkTxt: { color: COLORS.primary, fontWeight: "900" },

  fieldLbl: { marginTop: 10, marginBottom: 5, fontSize: 12, fontWeight: "900", color: "#4B5563" },
  input: {
    borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: COLORS.text, backgroundColor: "#FAFAFA",
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF" },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },

  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8F9FA",
  },
  infoLabel: { fontSize: 13, color: "#9CA3AF", fontWeight: "800" },
  infoVal: { fontSize: 13, color: COLORS.text, fontWeight: "800", maxWidth: "62%", textAlign: "right" },

  navRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F8F9FA",
  },

  addrCard: {
    backgroundColor: "#F9FAFB", borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: "#E5E7EB", marginBottom: 10,
  },
  addrCardDefault: { borderColor: "#FED7AA", backgroundColor: "#FFF7F4" },
  addrTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  addrText: { marginTop: 6, fontSize: 12, color: "#4B5563", lineHeight: 18 },
  addrMeta: { marginTop: 4, fontSize: 11, color: "#6B7280", fontWeight: "700" },
  addrInstr: { marginTop: 4, fontSize: 11, color: "#92400E", fontWeight: "700" },
  addrBtnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  smallBtnSoft: { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  smallBtnDanger: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  smallBtnTxt: { fontSize: 12, fontWeight: "800", color: COLORS.text },

  toggleRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F8F9FA",
  },
  toggleTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  toggleSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  helperTxt: { fontSize: 11, color: "#9CA3AF", marginTop: 14, lineHeight: 16 },

  bigBtn: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  bigBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 15 },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", padding: 16,
    borderTopWidth: 1, borderTopColor: "#F3F4F6",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 }, elevation: 4,
  },
  signOutBtn: {
    borderWidth: 1.5, borderColor: "#FECACA",
    borderRadius: 14, padding: 14, alignItems: "center",
    backgroundColor: "#FEF2F2",
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 22,
    width: "100%",
    elevation: 16, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.text, marginBottom: 14 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnGhost: { backgroundColor: "#F3F4F6" },
  btnTxt: { fontWeight: "800", fontSize: 14 },

  emailNote: {
    backgroundColor: "#EFF6FF", borderRadius: 10, padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  emailNoteTxt: { fontSize: 12, color: "#1E40AF", lineHeight: 18 },

  hint: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  hintOk: { fontSize: 11, color: "#10B981", marginTop: 4 },
  hintErr: { fontSize: 11, color: "#EF4444", marginTop: 4 },

  labelRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  labelChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  labelChipActive: { borderColor: COLORS.primary, backgroundColor: "#FFF3EE" },
  labelChipTxt: { fontSize: 11, fontWeight: "800", marginTop: 2 },
});

// ═══════════════════════════════════════════════════
// SMALL PURE UI COMPONENTS
// ═══════════════════════════════════════════════════
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={S.infoVal} numberOfLines={2}>{value || "—"}</Text>
    </View>
  );
}

function Pill({ text, tone = "default" }: { text: string; tone?: "default" | "good" | "bad" | "warn" }) {
  const bg = tone === "good" ? "#ECFDF5" : tone === "bad" ? "#FEF2F2" : tone === "warn" ? "#FFFBEB" : "rgba(255,255,255,0.2)";
  const bd = tone === "good" ? "#A7F3D0" : tone === "bad" ? "#FECACA" : tone === "warn" ? "#FDE68A" : "rgba(255,255,255,0.35)";
  const tx = tone === "good" ? "#065F46" : tone === "bad" ? "#B91C1C" : tone === "warn" ? "#92400E" : "#fff";
  return (
    <View style={[S.pill, { backgroundColor: bg, borderColor: bd }]}>
      <Text style={[S.pillTxt, { color: tx }]}>{text}</Text>
    </View>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>{title}</Text>
        {right ? <View>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

// ═══════════════════════════════════════════════════
// TAB BAR COMPONENT
// ═══════════════════════════════════════════════════
function TabBar({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string; emoji: string }[] = [
    { key: "profile",       label: "Profile",   emoji: "👤" },
    { key: "addresses",     label: "Addresses", emoji: "📍" },
    { key: "notifications", label: "Notifs",    emoji: "🔔" },
    { key: "security",      label: "Security",  emoji: "🔒" },
    { key: "requests",      label: "Requests",  emoji: "📋" },
  ];
  return (
    <View style={S.tabRow}>
      {tabs.map((t) => {
        const active = tab === t.key;
        return (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[S.tabBtn, active && S.tabBtnActive]} activeOpacity={0.85}>
            <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
            <Text style={[S.tabTxt, active && S.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════
// ADDRESS EDITOR MODAL — fully self-contained
// (no more leaked profile state or handleSave)
// ═══════════════════════════════════════════════════
interface AddressEditorProps {
  open: boolean;
  onClose: () => void;
  initial: NormalizedAddress | null;
  onSave: (payload: Partial<AddressRow>) => Promise<void>;
}

function AddressEditorModal({ open, onClose, initial, onSave }: AddressEditorProps) {
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState<string>("Home");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [apartmentFloor, setApartmentFloor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Reset fields when modal opens
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

  // This handleSave saves the ADDRESS (not the profile)
  const handleSave = async () => {
    if (!recipientName.trim()) { Alert.alert("Required", "Enter recipient name."); return; }
    if (!/^[6-9]\d{9}$/.test(recipientPhone)) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number."); return;
    }
    if (!address.trim()) { Alert.alert("Required", "Enter a full address."); return; }

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
    <Modal transparent animationType="slide" visible={open} onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <ScrollView
          style={{ width: "100%" }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>{initial ? "Edit Address" : "Add Address"}</Text>

            {/* Label picker */}
            <Text style={S.fieldLbl}>Label</Text>
            <View style={S.labelRow}>
              {(["Home", "Work", "Other"] as const).map((l) => (
                <TouchableOpacity
                  key={l} onPress={() => setLabel(l)}
                  style={[S.labelChip, label === l && S.labelChipActive]}
                >
                  <Text style={{ fontSize: 18 }}>
                    {l === "Home" ? "🏠" : l === "Work" ? "💼" : "📍"}
                  </Text>
                  <Text style={[S.labelChipTxt, { color: label === l ? COLORS.primary : "#6B7280" }]}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={S.fieldLbl}>Recipient name *</Text>
            <TextInput style={S.input} value={recipientName} onChangeText={setRecipientName}
              placeholder="Full name" placeholderTextColor="#9CA3AF" />

            <Text style={S.fieldLbl}>Recipient phone *</Text>
            <TextInput style={S.input} value={recipientPhone}
              onChangeText={(v) => setRecipientPhone(v.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile" keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />

            <Text style={S.fieldLbl}>Full address *</Text>
            <TextInput style={[S.input, { minHeight: 72, textAlignVertical: "top" }]}
              value={address} onChangeText={setAddress}
              placeholder="House no., street, area" multiline placeholderTextColor="#9CA3AF" />

            <Text style={S.fieldLbl}>Apartment / Floor</Text>
            <TextInput style={S.input} value={apartmentFloor} onChangeText={setApartmentFloor}
              placeholder="Flat 202, 2nd Floor" placeholderTextColor="#9CA3AF" />

            <Text style={S.fieldLbl}>Landmark</Text>
            <TextInput style={S.input} value={landmark} onChangeText={setLandmark}
              placeholder="Near City Mall" placeholderTextColor="#9CA3AF" />

            <Text style={S.fieldLbl}>Pincode</Text>
            <TextInput style={S.input} value={postalCode}
              onChangeText={(v) => setPostalCode(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit pincode" keyboardType="numeric" placeholderTextColor="#9CA3AF" />

            <Text style={S.fieldLbl}>Delivery instructions</Text>
            <TextInput style={[S.input, { minHeight: 60, textAlignVertical: "top" }]}
              value={deliveryInstructions} onChangeText={setDeliveryInstructions}
              placeholder="Ring bell twice" multiline placeholderTextColor="#9CA3AF" />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <TouchableOpacity style={[S.btn, S.btnGhost]} onPress={onClose} disabled={saving}>
                <Text style={[S.btnTxt, { color: "#6B7280" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.btn, S.btnPrimary, saving && { opacity: 0.7 }]}
                onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[S.btnTxt, { color: "#fff" }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// EMAIL CHANGE MODAL
// Email update requires verification — uses supabase.auth.updateUser
// ═══════════════════════════════════════════════════
function EmailChangeModal({ open, currentEmail, onClose }: {
  open: boolean; currentEmail: string; onClose: () => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address."); return;
    }
    if (email === currentEmail.toLowerCase()) {
      Alert.alert("Same email", "This is already your current email."); return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      Alert.alert(
        "Verification sent ✅",
        `A link was sent to ${email}. Your email will change after you click it.`,
        [{ text: "OK", onPress: () => { setNewEmail(""); onClose(); } }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send verification");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <View style={S.modalOverlay}>
        <View style={S.modalCard}>
          <Text style={S.modalTitle}>Change Email</Text>
          <View style={S.emailNote}>
            <Text style={S.emailNoteTxt}>
              ℹ️ A verification link will be sent to your NEW email. Your address only changes after you click the link.
            </Text>
          </View>
          <Text style={S.fieldLbl}>New email address</Text>
          <TextInput style={S.input} value={newEmail} onChangeText={setNewEmail}
            placeholder="new@example.com" keyboardType="email-address"
            autoCapitalize="none" autoComplete="email" placeholderTextColor="#9CA3AF" />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <TouchableOpacity style={[S.btn, S.btnGhost]} onPress={onClose} disabled={sending}>
              <Text style={[S.btnTxt, { color: "#6B7280" }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.btn, S.btnPrimary, sending && { opacity: 0.7 }]}
              onPress={handleSend} disabled={sending}>
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[S.btnTxt, { color: "#fff" }]}>Send link</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function ProfileSettingsPage() {
  const { user } = useAuth();          // Supabase auth User — has .id and .email
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("profile");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>({ promos: true, system: true, order_updates: true });
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, cancelled: 0, totalSpent: 0 });
  const [addresses, setAddresses] = useState<NormalizedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Profile edit ──
  const [editingProfile, setEditingProfile] = useState(false);
  /** form now includes username — fixes TS2353 */
  const [form, setForm] = useState({ full_name: "", phone: "", username: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Email change ──
  const [showEmailModal, setShowEmailModal] = useState(false);

  // ── Password ──
  const [pwd, setPwd] = useState({ a: "", b: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  // ── Avatar ──
  const [uploading, setUploading] = useState(false);

  // ── Address modal ──
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [addrEditing, setAddrEditing] = useState<NormalizedAddress | null>(null);

  const displayName = useMemo(() => {
    const fn = (profile?.full_name ?? "").trim();
    if (fn) return fn;
    return (user?.email ?? "").split("@")[0] || "User";
  }, [profile?.full_name, user?.email]);

  // ── Load all data ──
  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [pRes, ordersRes, addrRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("orders").select("status,totalamount").eq("customerid", user.id),
        supabase.from("saved_addresses").select("*").eq("customer_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (pRes.error) console.warn("Profile:", pRes.error.message);
      const p = (pRes.data ?? null) as ProfileRow | null;
      setProfile(p);
      setPrefs(parsePrefs(p?.notification_prefs));
      setForm({
        full_name: String(p?.full_name ?? "").trim(),
        phone: String(p?.phone ?? "").trim(),
        username: String(p?.username ?? "").trim(),   // ← username populated
      });

      if (!ordersRes.error) {
        const orders = (ordersRes.data ?? []) as any[];
        const completed = orders.filter((o) => String(o?.status).toLowerCase() === "delivered").length;
        const cancelled = orders.filter((o) => String(o?.status).toLowerCase() === "cancelled").length;
        const totalSpent = orders
          .filter((o) => String(o?.status).toLowerCase() === "delivered")
          .reduce((s, o) => s + safeNum(o?.totalamount, 0), 0);
        setStats({ total: orders.length, completed, cancelled, totalSpent });
      }
      if (!addrRes.error) {
        setAddresses((addrRes.data ?? []).map(normalizeAddress));
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  // ── Username uniqueness check (debounced) ──
  const checkUsername = useCallback((val: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const v = val.trim().toLowerCase();
    if (!v) { setUsernameStatus("idle"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(v)) { setUsernameStatus("invalid"); return; }
    if (v === (profile?.username ?? "").toLowerCase()) { setUsernameStatus("ok"); return; }
    setUsernameStatus("checking");
    usernameTimer.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles").select("id")
        .eq("username", v).neq("id", user?.id ?? "").maybeSingle();
      if (error && error.code !== "PGRST116") { setUsernameStatus("idle"); return; }
      setUsernameStatus(data?.id ? "taken" : "ok");
    }, 500);
  }, [profile?.username, user?.id]);

  // ── Save profile ──
  const saveProfile = async () => {
    if (!user?.id) return;
    if (usernameStatus === "taken")   { Alert.alert("Username taken", "Choose another."); return; }
    if (usernameStatus === "invalid") { Alert.alert("Invalid username", "3–20 chars: a-z, 0-9, _ only."); return; }
    if (usernameStatus === "checking") { Alert.alert("Please wait", "Checking username availability..."); return; }

    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name.trim() || null,
        phone: form.phone.replace(/\D/g, "").slice(0, 10) || null,
        username: form.username.trim().toLowerCase() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) throw error;
      setEditingProfile(false);
      await loadAll();
      Alert.alert("Saved ✅", "Profile updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Avatar upload ──
  const pickAvatar = async () => {
    if (!user?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission required", "Allow photo library access."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, res.assets[0].uri);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      await loadAll();
      Alert.alert("Done ✅", "Profile photo updated.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  // ── Notification prefs — fix: pass `next` not `setPrefs` ──
  const savePrefs = async (next: NotificationPrefs) => {
    if (!user?.id) return;
    setPrefs(next);   // optimistic
    const { error } = await supabase.from("profiles").update({
      notification_prefs: next,              // ← was wrongly `setPrefs`
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) { Alert.alert("Error", error.message); await loadAll(); }
  };

  // ── Address helpers ──
  const setDefaultAddress = async (addrId: string) => {
    if (!user?.id) return;
    try {
      await supabase.from("saved_addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("customer_id", user.id);
      const { error } = await supabase.from("saved_addresses")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", addrId);
      if (error) throw error;
      await loadAll();
    } catch (e: any) { Alert.alert("Error", e?.message ?? "Failed"); }
  };

  const deleteAddress = (addrId: string) => {
    Alert.alert("Delete address?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const { error } = await supabase.from("saved_addresses").delete().eq("id", addrId);
          if (error) throw error;
          await loadAll();
        } catch (e: any) { Alert.alert("Error", e?.message ?? "Failed"); }
      }},
    ]);
  };

  const upsertAddress = async (payload: Partial<AddressRow>) => {
    if (!user?.id) throw new Error("Not signed in");
    if (addrEditing?.id) {
      const { error } = await supabase.from("saved_addresses")
        .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", addrEditing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("saved_addresses").insert({
        ...payload,
        customer_id: user.id,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    await loadAll();
  };

  // ── Password ──
  const updatePassword = async () => {
    if (pwd.a.length < 6) { Alert.alert("Too short", "Min 6 characters."); return; }
    if (pwd.a !== pwd.b) { Alert.alert("Mismatch", "Passwords do not match."); return; }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.a });
      if (error) throw error;
      setPwd({ a: "", b: "" });
      Alert.alert("Done ✅", "Password updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    } finally { setSavingPwd(false); }
  };

  const signOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => {
        await supabase.auth.signOut();
        router.replace("/(auth)/login" as any);
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={S.center}>
        <Stack.Screen options={{ title: "Profile" }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const role = String(profile?.role ?? "customer").toUpperCase();
  const approval = String(profile?.approval_status ?? "approved").toLowerCase();
  const account = String(profile?.account_status ?? "active").toLowerCase();
  const trusted = safeBool(profile?.is_trusted, false);
  const trustScore = safeNum(profile?.trust_score, 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <Stack.Screen options={{
        title: "Profile & Settings",
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "800" },
      }} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO ── */}
        <View style={S.hero}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploading} style={{ marginBottom: 14 }}>
            {profile?.avatar_url
              ? <Image source={{ uri: profile.avatar_url }} style={S.avatar} />
              : (
                <View style={S.avatarPlaceholder}>
                  <Text style={{ fontSize: 38, color: "#fff", fontWeight: "900" }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            <View style={S.cameraBtn}>
              {uploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: "#fff" }}>📷</Text>}
            </View>
          </TouchableOpacity>

          <Text style={S.heroName}>{displayName}</Text>
          {profile?.username
            ? <Text style={S.heroUsername}>@{profile.username}</Text>
            : null}
          <Text style={S.heroEmail}>{user?.email ?? ""}</Text>

          <View style={S.pillRow}>
            <Pill text={`👤 ${role}`} />
            {approval !== "approved" ? <Pill text={`⏳ ${approval.toUpperCase()}`} tone="warn" /> : null}
            {account !== "active" ? <Pill text={`⚠️ ${account.toUpperCase()}`} tone="bad" /> : null}
            {trusted ? <Pill text="✅ TRUSTED" tone="good" /> : null}
          </View>

          <View style={S.trustBarWrap}>
            <View style={S.trustBarBg}>
              <View style={[S.trustBarFill, { width: `${Math.min(100, Math.max(0, trustScore))}%` as any }]} />
            </View>
            <Text style={S.trustTxt}>Trust score: {trustScore} / 100</Text>
          </View>
        </View>

        {/* ── STATS ── */}
        <View style={S.statsRow}>
          {[
            { label: "Orders",    value: String(stats.total),           emoji: "📦" },
            { label: "Done",      value: String(stats.completed),       emoji: "✅" },
            { label: "Cancelled", value: String(stats.cancelled),       emoji: "❌" },
            { label: "Spent",     value: moneyINR(stats.totalSpent),    emoji: "💰" },
          ].map((x, i) => (
            <View key={x.label} style={[S.statCard, i < 3 && S.statDivider]}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{x.emoji}</Text>
              <Text style={S.statVal}>{x.value}</Text>
              <Text style={S.statLbl}>{x.label}</Text>
            </View>
          ))}
        </View>

        {/* ── TABS ── */}
        <TabBar tab={tab} setTab={setTab} />

        {/* ══════════════════════════════════
            PROFILE TAB
        ══════════════════════════════════ */}
        {tab === "profile" ? (
          <>
            <Section
              title="Personal info"
              right={
                !editingProfile
                  ? (
                    <TouchableOpacity onPress={() => setEditingProfile(true)}>
                      <Text style={S.linkTxt}>✏️ Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      <TouchableOpacity onPress={() => {
                        setEditingProfile(false);
                        setUsernameStatus("idle");
                        setForm({
                          full_name: String(profile?.full_name ?? "").trim(),
                          phone: String(profile?.phone ?? "").trim(),
                          username: String(profile?.username ?? "").trim(),
                        });
                      }}>
                        <Text style={[S.linkTxt, { color: "#6B7280" }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={saveProfile} disabled={savingProfile}>
                        {savingProfile
                          ? <ActivityIndicator color={COLORS.primary} size="small" />
                          : <Text style={S.linkTxt}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  )
              }
            >
              {editingProfile ? (
                <>
                  <Text style={S.fieldLbl}>Full name</Text>
                  <TextInput style={S.input} value={form.full_name}
                    onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))}
                    placeholder="Your name" placeholderTextColor="#9CA3AF" />

                  <Text style={S.fieldLbl}>Username</Text>
                  <TextInput
                    style={S.input} value={form.username}
                    autoCapitalize="none" autoCorrect={false}
                    placeholder="e.g. ravi_patti" placeholderTextColor="#9CA3AF"
                    onChangeText={(v) => {
                      const clean = v.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
                      setForm((f) => ({ ...f, username: clean }));
                      checkUsername(clean);
                    }}
                  />
                  {form.username
                    ? (
                      usernameStatus === "checking" ? <Text style={S.hint}>Checking...</Text>
                      : usernameStatus === "ok"       ? <Text style={S.hintOk}>✅ Available</Text>
                      : usernameStatus === "taken"    ? <Text style={S.hintErr}>❌ Username taken</Text>
                      : usernameStatus === "invalid"  ? <Text style={S.hintErr}>3–20 chars: a-z, 0-9, _</Text>
                      : null
                    )
                    : <Text style={S.hint}>3–20 chars: lowercase letters, digits, underscore</Text>}

                  <Text style={S.fieldLbl}>Phone</Text>
                  <TextInput style={S.input} value={form.phone}
                    onChangeText={(v) => setForm((f) => ({ ...f, phone: v.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="10-digit phone" keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />

                  <Text style={S.fieldLbl}>Email</Text>
                  <View style={S.inputRow}>
                    <TextInput style={[S.input, S.inputDisabled, { flex: 1 }]}
                      value={user?.email ?? ""} editable={false} />
                    <TouchableOpacity
                      onPress={() => setShowEmailModal(true)}
                      style={{
                        backgroundColor: "#EFF6FF", borderRadius: 10,
                        paddingHorizontal: 12, paddingVertical: 12,
                        borderWidth: 1.5, borderColor: "#BFDBFE",
                      }}
                    >
                      <Text style={{ color: "#1D4ED8", fontWeight: "800", fontSize: 12 }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={S.emailNote}>
                    <Text style={S.emailNoteTxt}>
                      Email changes require verification. Tap &quot;Change&quot; — a link is sent to your new address.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <InfoRow label="Full name"   value={profile?.full_name ?? ""} />
                  <InfoRow label="Username"    value={profile?.username ? `@${profile.username}` : ""} />
                  <InfoRow label="Email"       value={user?.email ?? ""} />
                  <InfoRow label="Phone"       value={profile?.phone ?? ""} />
                  <InfoRow label="City"        value={profile?.city ?? ""} />
                  <InfoRow label="State"       value={profile?.state ?? ""} />
                  <InfoRow label="Role"        value={role} />
                  <InfoRow label="Last seen"   value={
                    profile?.last_seen_at
                      ? new Date(profile.last_seen_at).toLocaleDateString("en-IN")
                      : ""
                  } />
                </>
              )}
            </Section>

            <Section title="Quick links">
              {[
                { label: "My Orders",      emoji: "📋", path: "/(customer)/orders" },
                { label: "Offers & Deals", emoji: "🏷️",  path: "/(customer)/offers" },
                { label: "Custom Orders",  emoji: "✨",  path: "/(customer)/custom-order" },
              ].map((l) => (
                <TouchableOpacity key={l.label} style={S.navRow} onPress={() => router.push(l.path as any)}>
                  <Text style={{ fontSize: 20, width: 32 }}>{l.emoji}</Text>
                  <Text style={{ flex: 1, fontWeight: "700", color: COLORS.text }}>{l.label}</Text>
                  <Text style={{ color: "#D1D5DB", fontSize: 22 }}>›</Text>
                </TouchableOpacity>
              ))}
            </Section>
          </>
        ) : null}

        {/* ══════════════════════════════════
            ADDRESSES TAB
        ══════════════════════════════════ */}
        {tab === "addresses" ? (
          <>
            <Section
              title="Saved addresses"
              right={
                <TouchableOpacity onPress={() => { setAddrEditing(null); setAddrModalOpen(true); }}>
                  <Text style={S.linkTxt}>+ Add</Text>
                </TouchableOpacity>
              }
            >
              {addresses.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 28 }}>
                  <Text style={{ fontSize: 44, marginBottom: 10 }}>📍</Text>
                  <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>No saved addresses yet.</Text>
                  <TouchableOpacity
                    onPress={() => { setAddrEditing(null); setAddrModalOpen(true); }}
                    style={[S.bigBtn, { paddingHorizontal: 28, marginTop: 14 }]}
                  >
                    <Text style={S.bigBtnTxt}>Add your first address</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                addresses.map((a) => (
                  <View key={a.id} style={[S.addrCard, a.isDefault && S.addrCardDefault]}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Text style={S.addrTitle}>
                            {a.label === "Home" ? "🏠" : a.label === "Work" ? "💼" : "📍"} {a.label}
                          </Text>
                          {a.isDefault ? <Pill text="DEFAULT" tone="warn" /> : null}
                        </View>
                        <Text style={S.addrText} numberOfLines={3}>{a.address}</Text>
                        {(a.recipientName || a.recipientPhone) ? (
                          <Text style={S.addrMeta}>
                            {[a.recipientName, a.recipientPhone].filter(Boolean).join(" · ")}
                          </Text>
                        ) : null}
                        {a.landmark ? <Text style={S.addrMeta}>📌 Near {a.landmark}</Text> : null}
                        {a.deliveryInstructions
                          ? <Text style={S.addrInstr} numberOfLines={2}>💡 {a.deliveryInstructions}</Text>
                          : null}
                      </View>
                    </View>
                    <View style={S.addrBtnRow}>
                      {!a.isDefault ? (
                        <TouchableOpacity style={[S.smallBtn, S.smallBtnSoft]} onPress={() => setDefaultAddress(a.id)}>
                          <Text style={S.smallBtnTxt}>Set default</Text>
                        </TouchableOpacity>
                      ) : <View style={{ flex: 1 }} />}
                      <TouchableOpacity style={[S.smallBtn, S.smallBtnSoft]}
                        onPress={() => { setAddrEditing(a); setAddrModalOpen(true); }}>
                        <Text style={S.smallBtnTxt}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[S.smallBtn, S.smallBtnDanger]} onPress={() => deleteAddress(a.id)}>
                        <Text style={[S.smallBtnTxt, { color: "#B91C1C" }]}>🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </Section>

            {/* Address modal rendered inside the tab so it only mounts when needed */}
            <AddressEditorModal
              open={addrModalOpen}
              onClose={() => setAddrModalOpen(false)}
              initial={addrEditing}
              onSave={upsertAddress}
            />
          </>
        ) : null}

        {/* ══════════════════════════════════
            NOTIFICATIONS TAB
        ══════════════════════════════════ */}
        {tab === "notifications" ? (
          <Section title="Notification preferences">
            {([
              { key: "order_updates", label: "Order updates",  sub: "Preparing, out for delivery, delivered", emoji: "📦" },
              { key: "promos",        label: "Promos & offers", sub: "Discounts and coupon alerts",            emoji: "🏷️" },
              { key: "system",        label: "System alerts",   sub: "Account, security, important info",      emoji: "🔔" },
            ] as const).map((x) => {
              const enabled = (prefs as any)[x.key] as boolean;
              return (
                <View key={x.key} style={S.toggleRow}>
                  <Text style={{ fontSize: 22, width: 36 }}>{x.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={S.toggleTitle}>{x.label}</Text>
                    <Text style={S.toggleSub}>{x.sub}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(val) => savePrefs({ ...prefs, [x.key]: val })}
                    trackColor={{ false: "#E5E7EB", true: COLORS.primary }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}
            <Text style={S.helperTxt}>
              ⚠️ If notifications stop arriving, check battery optimisation and notification permissions in device settings.
            </Text>
          </Section>
        ) : null}

        {/* ══════════════════════════════════
            SECURITY TAB
        ══════════════════════════════════ */}
        {tab === "security" ? (
          <>
            <Section title="Change password">
              <Text style={S.fieldLbl}>New password</Text>
              <TextInput style={S.input} value={pwd.a}
                onChangeText={(v) => setPwd((p) => ({ ...p, a: v }))}
                placeholder="Min 6 characters" secureTextEntry placeholderTextColor="#9CA3AF" />
              <Text style={S.fieldLbl}>Confirm password</Text>
              <TextInput style={S.input} value={pwd.b}
                onChangeText={(v) => setPwd((p) => ({ ...p, b: v }))}
                placeholder="Repeat password" secureTextEntry placeholderTextColor="#9CA3AF" />
              {pwd.a && pwd.b && pwd.a !== pwd.b
                ? <Text style={[S.hintErr, { marginTop: 6 }]}>Passwords don&apos;t match</Text>
                : null}
              <TouchableOpacity style={[S.bigBtn, savingPwd && { opacity: 0.7 }]}
                onPress={updatePassword} disabled={savingPwd}>
                {savingPwd
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={S.bigBtnTxt}>Update password</Text>}
              </TouchableOpacity>
            </Section>

            <Section title="Account actions">
              <TouchableOpacity
                style={[S.bigBtn, { backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FECACA" }]}
                onPress={() => Alert.alert(
                  "Delete account",
                  "Contact pbexpress38@gmail.com to request account deletion.",
                  [{ text: "OK" }]
                )}
              >
                <Text style={[S.bigBtnTxt, { color: "#B91C1C" }]}>Request account deletion</Text>
              </TouchableOpacity>
            </Section>
          </>
        ) : null}

        {/* ══════════════════════════════════
            REQUESTS TAB
        ══════════════════════════════════ */}
        {tab === "requests" ? (
          <Section title="Access requests">
            <Text style={{ color: "#6B7280", lineHeight: 18 }}>
              Submit a request to upgrade your role to merchant or delivery driver.
            </Text>
            <TouchableOpacity style={[S.bigBtn, { marginTop: 12 }]}
              onPress={() => Alert.alert("Coming soon", "Access request flow will be added next.")}>
              <Text style={S.bigBtnTxt}>Request a role upgrade</Text>
            </TouchableOpacity>
          </Section>
        ) : null}
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={S.bottomBar}>
        <TouchableOpacity style={S.signOutBtn} onPress={signOut}>
          <Text style={{ color: "#EF4444", fontWeight: "900", fontSize: 15 }}>🚪 Sign out</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#9CA3AF" }}>
          PBExpress v1.0.0 · {Platform.OS.toUpperCase()}
        </Text>
      </View>

      {/* ── Modals ── */}
      <EmailChangeModal
        open={showEmailModal}
        currentEmail={user?.email ?? ""}
        onClose={() => setShowEmailModal(false)}
      />
    </View>
  );
}
