// lib/appleAuth.ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try { return await AppleAuthentication.isAvailableAsync(); }
  catch { return false; }
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

  // ── Name resolution (priority order) ──────────────────────────────────────
  // 1. Apple credential (only present on first-ever auth)
  const given  = credential.fullName?.givenName?.trim()  ?? '';
  const family = credential.fullName?.familyName?.trim() ?? '';
  const credentialName = [given, family].filter(Boolean).join(' ');

  // 2. Supabase user_metadata (stored by Supabase on first auth, persists)
  const metaName = String(
    data.user.user_metadata?.full_name ??
    data.user.user_metadata?.name ??
    '',
  ).trim();

  // 3. Email prefix — but private relay emails are random gibberish, use "Apple User"
  const email = credential.email ?? data.user.email ?? '';
  const isPrivateRelay = email.includes('@privaterelay.appleid.com');
  const emailFallback  = isPrivateRelay ? 'Apple User' : (email.split('@')[0] || 'Apple User');

  // Best name we have right now (may be empty on repeat logins)
  const bestNameNow = credentialName || metaName || '';

  // ── Check what's already in the DB ────────────────────────────────────────
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', data.user.id)
    .maybeSingle();

  // "has a real name" = non-null AND non-empty string
  const existingName = existing?.full_name?.trim() ?? '';
  const hasRealName  = existingName.length > 0;

  if (!existing) {
    // ── Brand new user: insert with best available name ────────────────────
    await supabase.from('profiles').insert({
      id:                data.user.id,
      email:             email || null,
      full_name:         bestNameNow || emailFallback,
      role:              'customer',
      approval_status:   'approved',
      is_active:         true,
      profile_completed: false,
      account_status:    'active',
    });
  } else {
    // ── Returning user ─────────────────────────────────────────────────────
    // Only update full_name if the DB has no real name yet.
    // Never overwrite a user-set name (e.g. they edited it in profile settings).
    if (!hasRealName) {
      const nameToSet = bestNameNow || emailFallback;
      await supabase
        .from('profiles')
        .update({ full_name: nameToSet })
        .eq('id', data.user.id);
    }
  }
}