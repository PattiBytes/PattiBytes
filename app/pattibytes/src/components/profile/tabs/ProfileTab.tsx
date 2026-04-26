// src/components/profile/tabs/ProfileTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fully connected to:
//  • ThemeContext   — live colors + themeId + colorScheme + isDark
//  • themes.ts      — label ✓  description ✓  emoji ✓
//  • profiles table — all columns used below; theme_id synced via ThemeContext
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { makeStyles }   from '../profileStyles';
import { Section }      from '../Section';
import { InfoRow }      from '../InfoRow';
import type { ProfileRow, UsernameStatus } from '../types';
import { useColors, useTheme, ColorScheme } from '../../../contexts/ThemeContext';
import { THEMES }       from '../../../lib/themes';
import ThemePicker      from '../../ui/ThemePicker';


// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (isNaN(sec) || sec < 0) return '—';
  if (sec < 10)        return 'just now';
  if (sec < 60)        return `${sec}s ago`;
  if (sec < 3_600)     return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86_400)    return `${Math.floor(sec / 3_600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const isPrivateRelay = (e: string) => e.includes('@privaterelay.appleid.com');
function str(v: string | null | undefined, fallback = ''): string {
  return v?.trim() || fallback;
}

// Segmented control options (icons only for compact size)
const SCHEME_OPTIONS: { value: ColorScheme; icon: string; label: string }[] = [
  { value: 'system', icon: '⚙️', label: 'Auto'  },
  { value: 'light',  icon: '☀️', label: 'Light' },
  { value: 'dark',   icon: '🌙', label: 'Dark'  },
];


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

  // ── Theme ─────────────────────────────────────────────────────────────────
  const colors                             = useColors();
  const { themeId, isDark, colorScheme, setColorScheme } = useTheme();
  const S                                  = makeStyles(colors);   // re-computes on theme change

  // Active theme object (label ✓  description ✓  emoji ✓ — all set in themes.ts)
  const activeTheme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  const [pickerOpen, setPickerOpen] = useState(false);

  const role = String(profile?.role ?? 'customer').toUpperCase();


  // ── Live last-seen ticker (refreshes every 30 s) ──────────────────────────
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


  // ── Cancel edit (reset form to current profile values) ───────────────────
  function cancelEdit() {
    setEditingProfile(false);
    setUsernameStatus('idle');
    setForm(() => ({
      full_name: str(profile?.full_name),
      phone:     str(profile?.phone),
      username:  str(profile?.username),
      city:      str(profile?.city),
      state:     str(profile?.state),
      pincode:   str(profile?.pincode),
      address:   str(profile?.address),
    }));
  }

  const displayFullName = str(profile?.full_name)
    || (isPrivateRelay(email) ? 'Apple User' : email.split('@')[0])
    || '—';
  const displayEmail = isPrivateRelay(email) ? '(Apple private email)' : email;


  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Personal info                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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
                <Text style={[S.linkTxt, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveProfile} disabled={savingProfile}>
                {savingProfile
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Text style={S.linkTxt}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          )
        }
      >
        {/* ─── EDITING MODE ─────────────────────────────────────────────── */}
        {editingProfile ? (
          <>
            {/* Full name */}
            <Text style={S.fieldLbl}>Full name</Text>
            <TextInput
              style={S.input}
              value={form.full_name}
              onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
              onChangeText={v => {
                const clean = v.trim().toLowerCase()
                  .replace(/[^a-z0-9_]/g, '').slice(0, 20);
                setForm(f => ({ ...f, username: clean }));
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
              onChangeText={v =>
                setForm(f => ({ ...f, phone: v.replace(/\D/g, '').slice(0, 10) }))
              }
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />

            {/* Address */}
            <Text style={S.fieldLbl}>Address</Text>
            <TextInput
              style={[S.input, { minHeight: 60, textAlignVertical: 'top' }]}
              value={form.address}
              onChangeText={v => setForm(f => ({ ...f, address: v }))}
              placeholder="House / flat, street, area"
              placeholderTextColor={colors.textMuted}
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
                  onChangeText={v => setForm(f => ({ ...f, city: v }))}
                  placeholder="Ludhiana"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.fieldLbl}>Pincode</Text>
                <TextInput
                  style={S.input}
                  value={form.pincode}
                  onChangeText={v =>
                    setForm(f => ({ ...f, pincode: v.replace(/\D/g, '').slice(0, 6) }))
                  }
                  placeholder="141001"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* State */}
            <Text style={S.fieldLbl}>State</Text>
            <TextInput
              style={S.input}
              value={form.state}
              onChangeText={v => setForm(f => ({ ...f, state: v }))}
              placeholder="Punjab"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            {/* Email — read-only + change button */}
            <Text style={S.fieldLbl}>Email</Text>
            <View style={S.inputRow}>
              <TextInput
                style={[S.input, S.inputDisabled, { flex: 1 }]}
                value={displayEmail}
                editable={false}
              />
              {!isPrivateRelay(email) && (
                <TouchableOpacity
                  onPress={onShowEmailModal}
                  style={{
                    backgroundColor:  colors.backgroundLight,
                    borderRadius:     10,
                    paddingHorizontal: 12,
                    paddingVertical:  12,
                    borderWidth:      1.5,
                    borderColor:      colors.border,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
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
          /* ─── READ MODE ─────────────────────────────────────────────────── */
          <>
            <InfoRow label="Full name"    value={displayFullName} />
            <InfoRow
              label="Username"
              value={profile?.username?.trim() ? `@${profile.username}` : '—'}
            />
            <InfoRow label="Email"        value={displayEmail} />
            <InfoRow label="Phone"        value={str(profile?.phone)   || '—'} />
            <InfoRow label="Address"      value={str(profile?.address) || '—'} />
            <InfoRow label="City"         value={str(profile?.city)    || '—'} />
            <InfoRow label="State"        value={str(profile?.state)   || '—'} />
            <InfoRow label="Pincode"      value={str(profile?.pincode) || '—'} />
            <InfoRow label="Role"         value={role} />
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
            <InfoRow label="Last seen"    value={lastSeenLabel} />
          </>
        )}
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Appearance                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section title="Appearance">

        {/* ── Colour theme row ──────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.75}
          style={aStyles.row}
        >
          {/* Live colour dot — repaints instantly when theme changes */}
          <View style={[
            aStyles.dot,
            {
              backgroundColor: colors.primary,
              shadowColor:     colors.primary,
            },
          ]} />

          <View style={{ flex: 1 }}>
            {/* label ✓ from themes.ts */}
            <Text style={[aStyles.rowTitle, { color: colors.text }]}>
              {activeTheme.emoji}{'  '}{activeTheme.label}
            </Text>
            {/* description ✓ from themes.ts — e.g. "Fresh & natural" */}
            <Text style={[aStyles.rowSub, { color: colors.textMuted }]}>
              {activeTheme.description}
            </Text>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[aStyles.divider, { backgroundColor: colors.borderFaint }]} />

        {/* ── Dark mode segmented control ───────────────────────────────── */}
        <View style={aStyles.row}>
          <View style={aStyles.dot}>
            {/* Moon/sun icon follows current resolved isDark */}
            <Text style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[aStyles.rowTitle, { color: colors.text }]}>
              {isDark ? 'Dark mode' : 'Light mode'}
            </Text>
            <Text style={[aStyles.rowSub, { color: colors.textMuted }]}>
              {colorScheme === 'system'
                ? 'Following system setting'
                : colorScheme === 'dark'
                ? 'Always dark'
                : 'Always light'}
            </Text>
          </View>

          {/* System / Light / Dark pill segments */}
          <View style={[aStyles.segment, { backgroundColor: colors.backgroundOffset }]}>
            {SCHEME_OPTIONS.map(opt => {
              const active = colorScheme === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setColorScheme(opt.value)}
                  style={[
                    aStyles.segBtn,
                    active && {
                      backgroundColor: colors.primary,
                      shadowColor:     colors.primary,
                      shadowOpacity:   0.25,
                      shadowRadius:    4,
                      shadowOffset:    { width: 0, height: 2 },
                      elevation:       2,
                    },
                  ]}
                  hitSlop={6}
                >
                  <Text style={aStyles.segIcon}>{opt.icon}</Text>
                  <Text style={[
                    aStyles.segLabel,
                    { color: active ? '#fff' : colors.textMuted },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ThemePicker bottom-sheet — setThemeId is synchronous so the whole
            app repaints before the sheet even finishes closing */}
        <ThemePicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
        />
      </Section>


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Quick links                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section title="Quick links">
        {[
          { label: 'My Orders',      emoji: '📋', path: '/(customer)/orders'       },
          { label: 'Offers & Deals', emoji: '🏷️', path: '/(customer)/offers'       },
          { label: 'Custom Orders',  emoji: '✨', path: '/(customer)/custom-order' },
        ].map(l => (
          <TouchableOpacity
            key={l.label}
            style={S.navRow}
            onPress={() => router.push(l.path as any)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, width: 32 }}>{l.emoji}</Text>
            <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>
              {l.label}
            </Text>
            {/* textMuted for chevron so it reads on any theme bg */}
            <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </Section>
    </>
  );
}


// ── Appearance-section-only styles (static structure; colours injected inline) ──
const aStyles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 14,
    gap:            12,
  },
  dot: {
    width:         32,
    height:        32,
    borderRadius:  16,
    alignItems:    'center',
    justifyContent:'center',
    // elevation / shadowOpacity set inline with primary colour
    shadowOpacity: 0.35,
    shadowRadius:  6,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     3,
  },
  rowTitle:  { fontSize: 15, fontWeight: '700' },
  rowSub:    { fontSize: 12, marginTop: 2 },
  divider:   { height: 1, marginVertical: 2, borderRadius: 1 },
  // Segmented control pill
  segment: {
    flexDirection: 'row',
    borderRadius:  20,
    padding:       3,
    gap:           2,
  },
  segBtn: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical:    6,
    borderRadius:   16,
    gap:            2,
  },
  segIcon:  { fontSize: 13 },
  segLabel: { fontSize: 10, fontWeight: '600' },
});
