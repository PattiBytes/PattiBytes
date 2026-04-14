// src/components/profile/tabs/ProfileTab.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { S } from '../profileStyles';
import { Section } from '../Section';
import { InfoRow } from '../InfoRow';
import { COLORS } from '../../../lib/constants';
import type { ProfileRow, UsernameStatus } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (isNaN(sec) || sec < 0) return '—';
  if (sec < 10)    return 'just now';
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const isPrivateRelay = (e: string) => e.includes('@privaterelay.appleid.com');

/** Safely extract a string field — treats null, undefined, AND '' as missing */
function str(v: string | null | undefined, fallback = ''): string {
  return v?.trim() || fallback;
}

export interface ProfileFormState {
  full_name: string;
  phone:     string;
  username:  string;
  city:      string;
  state:     string;
  pincode:   string;
  address:   string;
}

interface Props {
  profile:           ProfileRow | null;
  email:             string;
  editingProfile:    boolean;
  setEditingProfile: (v: boolean) => void;
  form:              ProfileFormState;
  setForm:           (updater: (f: ProfileFormState) => ProfileFormState) => void;
  savingProfile:     boolean;
  usernameStatus:    UsernameStatus;
  setUsernameStatus: (s: UsernameStatus) => void;
  checkUsername:     (val: string) => void;
  saveProfile:       () => void;
  onShowEmailModal:  () => void;
}

export function ProfileTab({
  profile, email, editingProfile, setEditingProfile,
  form, setForm, savingProfile, usernameStatus,
  setUsernameStatus, checkUsername, saveProfile, onShowEmailModal,
}: Props) {
  const router = useRouter();
  const role   = String(profile?.role ?? 'customer').toUpperCase();

  // ── Live last-seen ticker ─────────────────────────────────────────────────
  const [lastSeenLabel, setLastSeenLabel] = useState(
    () => timeAgo(profile?.last_seen_at),
  );
  useEffect(() => {
    setLastSeenLabel(timeAgo(profile?.last_seen_at));
    const id = setInterval(
      () => setLastSeenLabel(timeAgo(profile?.last_seen_at)),
      30_000,
    );
    return () => clearInterval(id);
  }, [profile?.last_seen_at]);

  // ── Cancel edit ───────────────────────────────────────────────────────────
  function cancelEdit() {
    setEditingProfile(false);
    setUsernameStatus('idle');
    setForm(() => ({
      // ✅ FIX: str() uses || so empty strings reset to '' not kept as ''
      full_name: str(profile?.full_name),
      phone:     str(profile?.phone),
      username:  str(profile?.username),
      city:      str(profile?.city),
      state:     str(profile?.state),
      pincode:   str(profile?.pincode),
      address:   str(profile?.address),
    }));
  }

  // ── Display values (read view) ────────────────────────────────────────────
  // ✅ FIX: || catches empty strings; ?? only catches null/undefined
  const displayFullName = str(profile?.full_name)
    || (isPrivateRelay(email) ? 'Apple User' : email.split('@')[0])
    || '—';

  const displayEmail = isPrivateRelay(email)
    ? '(Apple private email)'
    : email;

  return (
    <>
      {/* ── Personal info ── */}
      <Section
        title="Personal info"
        right={
          !editingProfile ? (
            <TouchableOpacity onPress={() => setEditingProfile(true)}>
              <Text style={S.linkTxt}>✏️ Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={[S.linkTxt, { color: '#6B7280' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveProfile} disabled={savingProfile}>
                {savingProfile
                  ? <ActivityIndicator color={COLORS.primary} size="small" />
                  : <Text style={S.linkTxt}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          )
        }
      >
        {editingProfile ? (
          <>
            {/* Full name */}
            <Text style={S.fieldLbl}>Full name</Text>
            <TextInput
              style={S.input}
              value={form.full_name}
              onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            {/* Username */}
            <Text style={S.fieldLbl}>Username</Text>
            <TextInput
              style={S.input}
              value={form.username}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. ravi_patti"
              placeholderTextColor="#9CA3AF"
              onChangeText={(v) => {
                const clean = v.trim().toLowerCase()
                  .replace(/[^a-z0-9_]/g, '').slice(0, 20);
                setForm((f) => ({ ...f, username: clean }));
                checkUsername(clean);
              }}
            />
            {form.username ? (
              usernameStatus === 'checking' ? (
                <Text style={S.hint}>Checking…</Text>
              ) : usernameStatus === 'ok' ? (
                <Text style={S.hintOk}>✅ Available</Text>
              ) : usernameStatus === 'taken' ? (
                <Text style={S.hintErr}>❌ Username taken</Text>
              ) : usernameStatus === 'invalid' ? (
                <Text style={S.hintErr}>3–20 chars: a-z, 0-9, _</Text>
              ) : null
            ) : (
              <Text style={S.hint}>3–20 chars: lowercase letters, digits, underscore</Text>
            )}

            {/* Phone */}
            <Text style={S.fieldLbl}>Phone</Text>
            <TextInput
              style={S.input}
              value={form.phone}
              onChangeText={(v) =>
                setForm((f) => ({ ...f, phone: v.replace(/\D/g, '').slice(0, 10) }))
              }
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />

            {/* Address */}
            <Text style={S.fieldLbl}>Address</Text>
            <TextInput
              style={[S.input, { minHeight: 60, textAlignVertical: 'top' }]}
              value={form.address}
              onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
              placeholder="House / flat, street, area"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
            />

            {/* City + Pincode */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <Text style={S.fieldLbl}>City</Text>
                <TextInput
                  style={S.input}
                  value={form.city}
                  onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                  placeholder="Ludhiana"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.fieldLbl}>Pincode</Text>
                <TextInput
                  style={S.input}
                  value={form.pincode}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, pincode: v.replace(/\D/g, '').slice(0, 6) }))
                  }
                  placeholder="141001"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* State */}
            <Text style={S.fieldLbl}>State</Text>
            <TextInput
              style={S.input}
              value={form.state}
              onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
              placeholder="Punjab"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />

            {/* Email (read-only) */}
            <Text style={S.fieldLbl}>Email</Text>
            <View style={S.inputRow}>
              <TextInput
                style={[S.input, S.inputDisabled, { flex: 1 }]}
                value={displayEmail}
                editable={false}
              />
              {/* Hide "Change" for private relay — Apple manages that email */}
              {!isPrivateRelay(email) && (
                <TouchableOpacity
                  onPress={onShowEmailModal}
                  style={{
                    backgroundColor: '#EFF6FF', borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 12,
                    borderWidth: 1.5, borderColor: '#BFDBFE',
                  }}
                >
                  <Text style={{ color: '#1D4ED8', fontWeight: '800', fontSize: 12 }}>
                    Change
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={S.emailNote}>
              <Text style={S.emailNoteTxt}>
                {isPrivateRelay(email)
                  ? 'You signed in with Apple. Email is managed by Apple.'
                  : 'Email changes require verification. A link will be sent to your new address.'}
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* ✅ FIX: use resolvedDisplayName so Apple users never see blank */}
            <InfoRow label="Full name" value={displayFullName} />
            <InfoRow
              label="Username"
              value={profile?.username?.trim() ? `@${profile.username}` : '—'}
            />
            <InfoRow label="Email"   value={displayEmail} />
            <InfoRow label="Phone"   value={str(profile?.phone)   || '—'} />
            <InfoRow label="Address" value={str(profile?.address) || '—'} />
            <InfoRow label="City"    value={str(profile?.city)    || '—'} />
            <InfoRow label="State"   value={str(profile?.state)   || '—'} />
            <InfoRow label="Pincode" value={str(profile?.pincode) || '—'} />
            <InfoRow label="Role"    value={role} />
            <InfoRow
              label="Member since"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })
                  : '—'
              }
            />
            <InfoRow label="Last seen" value={lastSeenLabel} />
          </>
        )}
      </Section>

      {/* ── Quick links ── */}
      <Section title="Quick links">
        {[
          { label: 'My Orders',      emoji: '📋', path: '/(customer)/orders'       },
          { label: 'Offers & Deals', emoji: '🏷️', path: '/(customer)/offers'       },
          { label: 'Custom Orders',  emoji: '✨', path: '/(customer)/custom-order' },
        ].map((l) => (
          <TouchableOpacity
            key={l.label}
            style={S.navRow}
            onPress={() => router.push(l.path as any)}
          >
            <Text style={{ fontSize: 20, width: 32 }}>{l.emoji}</Text>
            <Text style={{ flex: 1, fontWeight: '700', color: '#111827' }}>
              {l.label}
            </Text>
            <Text style={{ color: '#D1D5DB', fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </Section>
    </>
  );
}