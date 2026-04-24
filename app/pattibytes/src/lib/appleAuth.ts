import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try { return await AppleAuthentication.isAvailableAsync(); }
  catch { return false; }
}

/**
 * Universal profile-completion check.
 * Returns true if ANY user (Apple, Google, email) is missing
 * their display name OR username — both are required before ordering.
 */
export function needsProfileCompletion(
  fullName?: string | null,
  username?: string | null,
): boolean {
  const nameMissing     = !fullName?.trim()
  const usernameMissing = !username?.trim()
  return nameMissing || usernameMissing
}

/**
 * @deprecated use needsProfileCompletion instead
 * Kept for back-compat — callers in _layout.tsx still compile.
 */
export function appleUserNeedsOnboarding(
  provider?: string,
  fullName?: string | null,
  username?: string | null,
): boolean {
  return needsProfileCompletion(fullName, username)
}


/** Generates a unique-ish username like pattibytes_x7k2m9 */
export function generateUsername(prefix = 'pattibytes'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const rand = Array.from({ length: 7 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${prefix}_${rand}`;
}

/** Check if a username is already taken */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  return !!data;
}

/** Generate a username that is guaranteed unique in the DB */
export async function generateUniqueUsername(prefix = 'pattibytes'): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const candidate = generateUsername(prefix);
    const taken = await isUsernameTaken(candidate);
    if (!taken) return candidate;
    attempts++;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export async function signInWithApple(): Promise<void> {
  const available = await isAppleSignInAvailable();
  if (!available) throw new Error('Sign in with Apple is not available on this device.');

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken } = credential;
  if (!identityToken) throw new Error('No identity token received from Apple.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned after Apple sign-in.');

  // ── Name resolution ────────────────────────────────────────────────
  const given  = credential.fullName?.givenName?.trim()  ?? '';
  const family = credential.fullName?.familyName?.trim() ?? '';
  const credentialName = [given, family].filter(Boolean).join(' ');

  const metaName = String(
    data.user.user_metadata?.full_name ??
    data.user.user_metadata?.name ??
    '',
  ).trim();

  const email           = credential.email ?? data.user.email ?? '';
  const bestNameNow     = credentialName || metaName || '';

  // ── Check existing profile ─────────────────────────────────────────
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name, username, profile_completed')
    .eq('id', data.user.id)
    .maybeSingle();

  const existingName     = existing?.full_name?.trim() ?? '';
  const hasRealName      = existingName.length > 0 && existingName !== 'Apple User';
  const hasUsername      = !!(existing?.username?.trim());
  // ✅ FIX #1 — profile_completed reflects actual completeness, not just existence
  const isActuallyComplete = hasRealName && hasUsername;

  if (!existing) {
    // Brand new user — insert with profile_completed: false
    // They will be redirected to onboarding screen after this
    const username = await generateUniqueUsername();
    await supabase.from('profiles').insert({
      id:                data.user.id,
      email:             email || null,
      full_name:         bestNameNow || 'Apple User',
      username,
      role:              'customer',
      approval_status:   'approved',
      is_active:         true,
      profile_completed: false,   // ← always false on first sign-in; onboarding sets true
      account_status:    'active',
    });
  } else {
    // Returning user — patch name/username only if genuinely missing
    const updates: Record<string, any> = {};

    if (!hasRealName && bestNameNow) {
      updates.full_name = bestNameNow;
    }
    if (!hasUsername) {
      updates.username = await generateUniqueUsername();
    }
    // ✅ FIX #1 — Sync profile_completed based on actual field state
    if (!isActuallyComplete) {
      updates.profile_completed = false;
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user.id);
    }
  }
}