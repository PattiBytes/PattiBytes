// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { S } from "../profileStyles";
import { Section } from "../Section";
import { InfoRow } from "../InfoRow";
import { COLORS } from "../../../lib/constants";
import type { ProfileRow, UsernameStatus } from "../types";

interface Props {
  profile: ProfileRow | null;
  email: string;
  editingProfile: boolean;
  setEditingProfile: (v: boolean) => void;
  form: { full_name: string; phone: string; username: string };
  setForm: (updater: (f: any) => any) => void;
  savingProfile: boolean;
  usernameStatus: UsernameStatus;
  setUsernameStatus: (s: UsernameStatus) => void;
  checkUsername: (val: string) => void;
  saveProfile: () => void;
  onShowEmailModal: () => void;
}

export function ProfileTab({
  profile,
  email,
  editingProfile,
  setEditingProfile,
  form,
  setForm,
  savingProfile,
  usernameStatus,
  setUsernameStatus,
  checkUsername,
  saveProfile,
  onShowEmailModal,
}: Props) {
  const router = useRouter();
  const role = String(profile?.role ?? "customer").toUpperCase();

  return (
    <>
      <Section
        title="Personal info"
        right={
          !editingProfile ? (
            <TouchableOpacity onPress={() => setEditingProfile(true)}>
              <Text style={S.linkTxt}>✏️ Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", gap: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditingProfile(false);
                  setUsernameStatus("idle");
                  setForm(() => ({
                    full_name: String(profile?.full_name ?? "").trim(),
                    phone: String(profile?.phone ?? "").trim(),
                    username: String(profile?.username ?? "").trim(),
                  }));
                }}
              >
                <Text style={[S.linkTxt, { color: "#6B7280" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={S.linkTxt}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )
        }
      >
        {editingProfile ? (
          <>
            <Text style={S.fieldLbl}>Full name</Text>
            <TextInput
              style={S.input}
              value={form.full_name}
              onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Username</Text>
            <TextInput
              style={S.input}
              value={form.username}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. ravi_patti"
              placeholderTextColor="#9CA3AF"
              onChangeText={(v) => {
                const clean = v
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 20);
                setForm((f) => ({ ...f, username: clean }));
                checkUsername(clean);
              }}
            />
            {form.username ? (
              usernameStatus === "checking" ? (
                <Text style={S.hint}>Checking...</Text>
              ) : usernameStatus === "ok" ? (
                <Text style={S.hintOk}>✅ Available</Text>
              ) : usernameStatus === "taken" ? (
                <Text style={S.hintErr}>❌ Username taken</Text>
              ) : usernameStatus === "invalid" ? (
                <Text style={S.hintErr}>3–20 chars: a-z, 0-9, _</Text>
              ) : null
            ) : (
              <Text style={S.hint}>
                3–20 chars: lowercase letters, digits, underscore
              </Text>
            )}

            <Text style={S.fieldLbl}>Phone</Text>
            <TextInput
              style={S.input}
              value={form.phone}
              onChangeText={(v) =>
                setForm((f) => ({
                  ...f,
                  phone: v.replace(/\D/g, "").slice(0, 10),
                }))
              }
              placeholder="10-digit phone"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={S.fieldLbl}>Email</Text>
            <View style={S.inputRow}>
              <TextInput
                style={[S.input, S.inputDisabled, { flex: 1 }]}
                value={email}
                editable={false}
              />
              <TouchableOpacity
                onPress={onShowEmailModal}
                style={{
                  backgroundColor: "#EFF6FF",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderWidth: 1.5,
                  borderColor: "#BFDBFE",
                }}
              >
                <Text style={{ color: "#1D4ED8", fontWeight: "800", fontSize: 12 }}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>
            <View style={S.emailNote}>
              <Text style={S.emailNoteTxt}>
                Email changes require verification. A link is sent to your new
                address.
              </Text>
            </View>
          </>
        ) : (
          <>
            <InfoRow label="Full name" value={profile?.full_name ?? ""} />
            <InfoRow
              label="Username"
              value={profile?.username ? `@${profile.username}` : ""}
            />
            <InfoRow label="Email" value={email} />
            <InfoRow label="Phone" value={profile?.phone ?? ""} />
            <InfoRow label="City" value={profile?.city ?? ""} />
            <InfoRow label="State" value={profile?.state ?? ""} />
            <InfoRow label="Pincode" value={profile?.pincode ?? ""} />
            <InfoRow label="Role" value={role} />
            <InfoRow
              label="Member since"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-IN")
                  : ""
              }
            />
            <InfoRow
              label="Last seen"
              value={
                profile?.last_seen_at
                  ? new Date(profile.last_seen_at).toLocaleDateString("en-IN")
                  : ""
              }
            />
          </>
        )}
      </Section>

      <Section title="Quick links">
        {[
          { label: "My Orders", emoji: "📋", path: "/(customer)/orders" },
          { label: "Offers & Deals", emoji: "🏷️", path: "/(customer)/offers" },
          {
            label: "Custom Orders",
            emoji: "✨",
            path: "/(customer)/custom-order",
          },
        ].map((l) => (
          <TouchableOpacity
            key={l.label}
            style={S.navRow}
            onPress={() => router.push(l.path as any)}
          >
            <Text style={{ fontSize: 20, width: 32 }}>{l.emoji}</Text>
            <Text style={{ flex: 1, fontWeight: "700", color: "#111827" }}>
              {l.label}
            </Text>
            <Text style={{ color: "#D1D5DB", fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </Section>
    </>
  );
}