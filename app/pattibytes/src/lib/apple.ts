// lib/apple.ts
import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// ─── Availability ─────────────────────────────────────────────────────────────

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try { return await AppleAuthentication.isAvailableAsync() }
  catch { return false }
}

// ─── Profile completion check (universal — all sign-in methods) ───────────────

/**
 * Returns true if ANY user (Apple, Google, email) is missing
 * their display name OR username — both required before ordering.
 */
export function needsProfileCompletion(
  fullName?: string | null,
  username?: string | null,
): boolean {
  const nameMissing     = !fullName?.trim() || fullName.trim() === 'Apple User'
  const usernameMissing = !username?.trim()
  return nameMissing || usernameMissing
}

/**
 * @deprecated Use needsProfileCompletion instead.
 * Kept for back-compat — existing callers still compile.
 */
export function appleUserNeedsOnboarding(
  _provider?: string,
  fullName?: string | null,
  username?: string | null,
): boolean {
  return needsProfileCompletion(fullName, username)
}

// ─── Username utilities ───────────────────────────────────────────────────────

/** Generates a random username like `pattibytes_x7k2m9` */
export function generateUsername(prefix = 'pattibytes'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const rand = Array.from({ length: 7 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
  return `${prefix}_${rand}`
}

/** Returns true if a username is already taken in the DB */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle()
  return !!data
}

/** Generates a username guaranteed to be unique in the DB (up to 12 attempts) */
export async function generateUniqueUsername(prefix = 'pattibytes'): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const candidate = generateUsername(prefix)
    if (!(await isUsernameTaken(candidate))) return candidate
  }
  // Final fallback: epoch-based, virtually guaranteed unique
  const fallback = `${prefix}_${Date.now().toString(36)}`
  // One last uniqueness check — if taken (astronomically unlikely), append extra chars
  if (await isUsernameTaken(fallback)) {
    return `${fallback}${Math.random().toString(36).slice(2, 5)}`
  }
  return fallback
}

// ─── Apple Sign In ────────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<void> {
  const available = await isAppleSignInAvailable()
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.')
  }

  // Step 1 — Apple native credential
  // ⚠️  Apple ONLY sends fullName + email on the VERY FIRST sign-in.
  //     All subsequent sign-ins return null for both fields.
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  })

  const { identityToken } = credential
  if (!identityToken) throw new Error('No identity token received from Apple.')

  // Step 2 — Supabase sign-in with Apple's identity token
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
  })
  if (error) throw error
  if (!data.user) throw new Error('No user returned after Apple sign-in.')

  // Step 3 — Resolve the best available name
  // Apple only provides credential.fullName on the FIRST sign-in.
  // After that, fall back to user_metadata stored by a previous sign-in.
  const given  = credential.fullName?.givenName?.trim()  ?? ''
  const family = credential.fullName?.familyName?.trim() ?? ''
  const credentialName = [given, family].filter(Boolean).join(' ')

  const metaName = String(
    data.user.user_metadata?.full_name ??
    data.user.user_metadata?.name ??
    '',
  ).trim()

  const email       = credential.email ?? data.user.email ?? ''
  const bestName    = credentialName || metaName || ''

  // Step 4 — Persist name to Supabase auth.users metadata immediately
  // This ensures the trigger/profile upsert downstream has the name available.
  // Only update if we actually have a name from this sign-in.
  if (credentialName) {
    await supabase.auth.updateUser({
      data: {
        full_name:   credentialName,
        given_name:  given,
        family_name: family,
      },
    }).catch(() => {}) // non-blocking — profile upsert below is the source of truth
  }

  // Step 5 — Check for existing profile row
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name, username, profile_completed')
    .eq('id', data.user.id)
    .maybeSingle()

  const existingName = existing?.full_name?.trim() ?? ''
  const hasRealName  = existingName.length > 0 && existingName !== 'Apple User'
  const hasUsername  = !!(existing?.username?.trim())
  // profile_completed is only true when both name AND username are genuinely set
  const isActuallyComplete = hasRealName && hasUsername

  if (!existing) {
    // ── Brand new user ─────────────────────────────────────────────────────
    // Use upsert (not insert) in case a Supabase DB trigger already
    // created a minimal profile row before we get here.
    const username = await generateUniqueUsername()
    await supabase.from('profiles').upsert(
      {
        id:                data.user.id,
        email:             email || null,
        full_name:         bestName || 'Apple User',
        username,
        role:              'customer',
        approval_status:   'approved',
        is_active:         true,
        account_status:    'active',
        profile_completed: false,   // onboarding screen sets this to true
        created_at:        new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: false },
    )
  } else {
    // ── Returning user — patch only genuinely missing fields ───────────────
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Update name only if currently missing/placeholder AND we got one now
    if (!hasRealName && bestName) {
      updates.full_name = bestName
    }

    // Generate username if missing
    if (!hasUsername) {
      updates.username = await generateUniqueUsername()
    }

    // Keep profile_completed in sync with actual field state
    if (!isActuallyComplete) {
      updates.profile_completed = false
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', data.user.id)
  }
}