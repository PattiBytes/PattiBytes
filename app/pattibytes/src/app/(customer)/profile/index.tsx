/* eslint-disable @typescript-eslint/no-unused-vars */
// ─────────────────────────────────────────────────────────────
// Profile page — thin orchestrator (~120 lines)
// All UI lives in components/profile/
// ─────────────────────────────────────────────────────────────
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { COLORS } from "../../../lib/constants";
import {
  ProfileHero,
  ProfileFooter,
  TabBar,
  ProfileTab,
  AddressesTab,
  NotificationsTab,
  SecurityTab,
  RequestsTab,
  EmailChangeModal,
  uploadAvatar,
  safeNum,
  safeBool,
  parsePrefs,
  normalizeAddress,
 profileStyles as S } from "../../../components/profile";
import type {
  TabKey,
  ProfileRow,
  NotificationPrefs,
  Stats,
  AddressRow,
  LegalPage,
  UsernameStatus,
} from "../../../components/profile";
import type { NormalizedAddress } from "../../../components/profile/helpers";


export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>("profile");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    promos: true,
    system: true,
    order_updates: true,
  });
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completed: 0,
    cancelled: 0,
    totalSpent: 0,
  });
  const [addresses, setAddresses] = useState<NormalizedAddress[]>([]);
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
const [form, setForm] = useState({
  full_name: '', phone: '', username: '',
  city: '', state: '', pincode: '', address: '',
});
  const [savingProfile, setSavingProfile] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Password
  const [pwd, setPwd] = useState({ a: "", b: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  // Address modal
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [addrEditing, setAddrEditing] = useState<NormalizedAddress | null>(null);

  // ── Derived ────────────────────────────────────────────────
  const displayName = useMemo(() => {
    const fn = (profile?.full_name ?? "").trim();
    return fn || (user?.email ?? "").split("@")[0] || "User";
  }, [profile?.full_name, user?.email]);

  // ── Load all ───────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [pRes, ordersRes, addrRes, legalRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
  .from("orders")
  .select("status,total_amount")  // ✅ snake_case
  .eq("customer_id", user.id),    // ✅ snake_case
        supabase
          .from("saved_addresses")
          .select("*")
          .eq("customer_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("legal_pages")
          .select("id,slug,title,is_active")
          .eq("is_active", true)
          .order("created_at"),
      ]);

      const p = (pRes.data ?? null) as ProfileRow | null;
      setProfile(p);
      setPrefs(parsePrefs(p?.notification_prefs));
      setForm({
  full_name: String(p?.full_name ?? '').trim(),
  phone:     String(p?.phone     ?? '').trim(),
  username:  String(p?.username  ?? '').trim(),
  city:      String(p?.city      ?? '').trim(),
  state:     String(p?.state     ?? '').trim(),
  pincode:   String(p?.pincode   ?? '').trim(),
  address:   String(p?.address   ?? '').trim(),
});
supabase
  .from('profiles')
  .update({ last_seen_at: new Date().toISOString() })
  .eq('id', user.id)
  .then(() => {});

      if (!ordersRes.error) {
        const orders = (ordersRes.data ?? []) as any[];
        const completed = orders.filter(
          (o) => String(o?.status).toLowerCase() === "delivered"
        ).length;
        const cancelled = orders.filter(
          (o) => String(o?.status).toLowerCase() === "cancelled"
        ).length;
       const totalSpent = orders
  .filter((o) => String(o?.status).toLowerCase() === "delivered")
  .reduce((s, o) => s + safeNum(o?.total_amount, 0), 0);  // ✅
        setStats({ total: orders.length, completed, cancelled, totalSpent });
      }
      if (!addrRes.error)
        setAddresses((addrRes.data ?? []).map(normalizeAddress));
      if (!legalRes.error)
        setLegalPages((legalRes.data ?? []) as LegalPage[]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // ── Username check ─────────────────────────────────────────
  const checkUsername = useCallback(
    (val: string) => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
      const v = val.trim().toLowerCase();
      if (!v) { setUsernameStatus("idle"); return; }
      if (!/^[a-z0-9_]{3,20}$/.test(v)) { setUsernameStatus("invalid"); return; }
      if (v === (profile?.username ?? "").toLowerCase()) {
        setUsernameStatus("ok");
        return;
      }
      setUsernameStatus("checking");
      usernameTimer.current = setTimeout(async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", v)
          .neq("id", user?.id ?? "")
          .maybeSingle();
        if (error && error.code !== "PGRST116") {
          setUsernameStatus("idle");
          return;
        }
        setUsernameStatus(data?.id ? "taken" : "ok");
      }, 500);
    },
    [profile?.username, user?.id]
  );

  // ── Save profile ───────────────────────────────────────────
 const saveProfile = async () => {
  if (!user?.id) return;
  if (usernameStatus === 'taken')    { Alert.alert('Username taken',   'Choose another.'); return; }
  if (usernameStatus === 'invalid')  { Alert.alert('Invalid username', '3–20 chars a-z, 0-9, _ only.'); return; }
  if (usernameStatus === 'checking') { Alert.alert('Please wait',      'Checking username availability…'); return; }

  setSavingProfile(true);
  try {
    const currentUsername = (profile?.username ?? '').toLowerCase();
    const newUsername     = form.username.trim().toLowerCase();
    const usernameChanged = newUsername !== currentUsername;

    const payload: Record<string, any> = {
      full_name:  form.full_name.trim() || null,
      phone:      form.phone.replace(/\D/g, '').slice(0, 10) || null,
      city:       form.city.trim()    || null,
      state:      form.state.trim()   || null,
      pincode:    form.pincode.trim() || null,
      address:    form.address.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Only include username in payload when it actually changed
    // — prevents spurious profiles_username_key constraint violations
    if (usernameChanged) {
      payload.username = newUsername || null;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (error) {
      if (
        error.code === '23505' ||
        String(error.message).includes('profiles_username_key')
      ) {
        setUsernameStatus('taken');
        Alert.alert('Username taken', 'That username is already in use. Please choose another.');
        return;
      }
      throw error;
    }

    setEditingProfile(false);
    await loadAll();
    Alert.alert('Saved ✅', 'Profile updated successfully.');
  } catch (e: any) {
    Alert.alert('Error', e?.message ?? 'Failed to save profile');
  } finally {
    setSavingProfile(false);
  }
};

  // ── Avatar ─────────────────────────────────────────────────
  const pickAvatar = async () => {
    if (!user?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo library access.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, res.assets[0].uri);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      await loadAll();
      Alert.alert("Done ✅", "Profile photo updated.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  // ── Notification prefs ─────────────────────────────────────
  const savePrefs = async (next: NotificationPrefs) => {
    if (!user?.id) return;
    setPrefs(next);
    const { error } = await supabase.from("profiles").update({
      notification_prefs: next,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) { Alert.alert("Error", error.message); await loadAll(); }
  };

  // ── Addresses ──────────────────────────────────────────────
  const setDefaultAddress = async (addrId: string) => {
    if (!user?.id) return;
    await supabase.from("saved_addresses")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("customer_id", user.id);
    const { error } = await supabase.from("saved_addresses")
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", addrId);
    if (error) Alert.alert("Error", error.message);
    else await loadAll();
  };

  const deleteAddress = (addrId: string) => {
    Alert.alert("Delete address?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("saved_addresses")
            .delete()
            .eq("id", addrId);
          if (error) Alert.alert("Error", error.message);
          else await loadAll();
        },
      },
    ]);
  };

  const upsertAddress = async (payload: Partial<AddressRow>) => {
    if (!user?.id) throw new Error("Not signed in");
    if (addrEditing?.id) {
      const { error } = await supabase.from("saved_addresses")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", addrEditing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("saved_addresses").insert({
        ...payload,
        customer_id: user.id,
        is_default: addresses.length === 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
    await loadAll();
  };

  // ── Password ───────────────────────────────────────────────
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
    } finally {
      setSavingPwd(false);
    }
  };

  // ── Sign out ───────────────────────────────────────────────
  const signOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  // ── Loading screen ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={S.center}>
        <Stack.Screen options={{ title: "Profile" }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <Stack.Screen
        options={{
          title: "Profile & Settings",
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHero
          profile={profile}
          displayName={displayName}
          email={user?.email ?? ""}
          stats={stats}
          uploading={uploading}
          onPickAvatar={pickAvatar}
        />

        <TabBar tab={tab} setTab={setTab} />

        {tab === "profile" && (
          <ProfileTab
            profile={profile}
            email={user?.email ?? ""}
            editingProfile={editingProfile}
            setEditingProfile={setEditingProfile}
            form={form}
            setForm={setForm}
            savingProfile={savingProfile}
            usernameStatus={usernameStatus}
            setUsernameStatus={setUsernameStatus}
            checkUsername={checkUsername}
            saveProfile={saveProfile}
            onShowEmailModal={() => setShowEmailModal(true)}
          />
        )}
        {tab === "addresses" && (
          <AddressesTab
            addresses={addresses}
            addrModalOpen={addrModalOpen}
            addrEditing={addrEditing}
            setAddrEditing={setAddrEditing}
            setAddrModalOpen={setAddrModalOpen}
            setDefaultAddress={setDefaultAddress}
            deleteAddress={deleteAddress}
            upsertAddress={upsertAddress}
          />
        )}
        {tab === "notifications" && (
          <NotificationsTab prefs={prefs} savePrefs={savePrefs} />
        )}
        {tab === "security" && (
          <SecurityTab
            userId={user?.id ?? ""}
            pwd={pwd}
            setPwd={setPwd}
            savingPwd={savingPwd}
            updatePassword={updatePassword}
            showDeleteModal={showDeleteModal}
            setShowDeleteModal={setShowDeleteModal}
          />
        )}
        {tab === "requests" && <RequestsTab userId={user?.id ?? ""} />}

        {/* Footer with Thrillyverse branding + legal links */}
        <ProfileFooter legalPages={legalPages} />
      </ScrollView>

      {/* Bottom sign-out bar */}
      <View style={S.bottomBar}>
        <TouchableOpacity style={S.signOutBtn} onPress={signOut}>
          <Text style={{ color: "#EF4444", fontWeight: "900", fontSize: 15 }}>
            🚪 Sign out
          </Text>
        </TouchableOpacity>
        <Text
          style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#9CA3AF" }}
        >
          PBExpress · {Platform.OS.toUpperCase()} · PattiBytes Express™
        </Text>
      </View>

      {/* Global modals */}
      <EmailChangeModal
        open={showEmailModal}
        currentEmail={user?.email ?? ""}
        onClose={() => setShowEmailModal(false)}
      />
    </View>
  );
}