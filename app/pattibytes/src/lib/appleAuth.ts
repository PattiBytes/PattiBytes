// lib/appleAuth.ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Returns true only on iOS 13+ devices that support Sign in with Apple.
 * Always false on Android / web.
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Full Sign in with Apple → Supabase flow.
 *
 * ⚠️  IMPORTANT: Apple only sends the user's real name + email on the
 *     VERY FIRST authorisation. We must save it to our profiles table
 *     immediately, or it is lost forever.
 */
export async function signInWithApple(): Promise<void> {
  const available = await isAppleSignInAvailable();
  if (!available) throw new Error('Sign in with Apple is not available on this device.');

  // This launches the native Apple sheet
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken } = credential;
  if (!identityToken) throw new Error('No identity token received from Apple.');

  // Exchange Apple identity token for a Supabase session
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned after Apple sign-in.');

  // Build the best name we can from whatever Apple gave us
  const given  = credential.fullName?.givenName?.trim()  ?? '';
  const family = credential.fullName?.familyName?.trim() ?? '';
  const fullName = [given, family].filter(Boolean).join(' ');

  // Only upsert when we actually have new info (first sign-in)
  if (fullName || credential.email) {
    const fallbackName = data.user.email?.split('@')[0] ?? 'Apple User';
    await supabase.from('profiles').upsert(
      {
        id:                  data.user.id,
        email:               credential.email ?? data.user.email ?? null,
        full_name:           fullName || fallbackName,
        role:                'customer',
        approval_status:     'approved',
        is_active:           true,
        profile_completed:   Boolean(fullName),
      },
      { onConflict: 'id', ignoreDuplicates: false }
    );
  }
}
