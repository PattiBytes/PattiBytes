// lib/googleAuth.ts
import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from './supabase'
import { isExpoGo } from './notificationHandler'

WebBrowser.maybeCompleteAuthSession()

// ─── Ensure profile row exists after OAuth ────────────────────────────────────
async function ensureProfile(
  userId: string,
  meta?: { full_name?: string | null; avatar_url?: string | null; email?: string | null }
) {
  try {
    // ✅ FIX: use maybeSingle() — cleaner, no PGRST116 error needed
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (!existing) {
      // ✅ FIX: snake_case column names to match DB schema (signup.tsx reference)
      // ✅ FIX: added email field
      const { error: insertErr } = await supabase.from('profiles').upsert({
        id:                userId,
        email:             meta?.email ?? null,
        full_name:         meta?.full_name ?? 'User',
        username:          null,
        avatar_url:        meta?.avatar_url ?? null,
        role:              'customer',
        approval_status:   'approved',
        is_active:         true,
        profile_completed: false,
      })
      if (insertErr) console.warn('[googleAuth] ensureProfile upsert:', insertErr.message)
    }
  } catch (e: any) {
    console.warn('[googleAuth] ensureProfile:', e.message)
  }
}

// ─── Redirect URI ─────────────────────────────────────────────────────────────
export function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'pattibytesexpress',
    path:   'auth/callback',
  })
}

// ─── OAuth web/browser fallback (Expo Go + web) ───────────────────────────────
async function signInWithOAuthFallback() {
  const redirectUri = getRedirectUri()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo:          redirectUri,
      skipBrowserRedirect: true,
      queryParams:         { prompt: 'select_account' },
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Could not start Google sign-in.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri)
  if (result.type === 'cancel' || result.type === 'dismiss')
    throw new Error('Sign in was cancelled')
  if (result.type !== 'success') throw new Error('Google sign-in failed.')

  const { data: sessionData, error: exErr } =
    await supabase.auth.exchangeCodeForSession((result as any).url)
  if (exErr) throw exErr

  if (sessionData?.user) {
    await ensureProfile(sessionData.user.id, {
      full_name:  sessionData.user.user_metadata?.full_name,
      avatar_url: sessionData.user.user_metadata?.avatar_url,
      email:      sessionData.user.email,
    })
  }
  return sessionData
}

// ─── Native Google Sign-In (Android / iOS prod) ───────────────────────────────
async function signInNative() {
  const pkg = await import('@react-native-google-signin/google-signin')
  const { GoogleSignin, statusCodes } = pkg as any

  GoogleSignin.configure({
    webClientId:             process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:             process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess:           true,
    forceCodeForRefreshToken: true,
  })

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    await GoogleSignin.signOut()

    const info    = await GoogleSignin.signIn()
    const idToken: string | undefined = info?.data?.idToken ?? info?.idToken
    if (!idToken) throw new Error('No ID token returned from Google.')

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token:    idToken,
    })
    if (error) throw error

    const userInfo = info?.data?.user ?? info?.user
    if (data?.user) {
      await ensureProfile(data.user.id, {
        full_name:  userInfo?.name,
        avatar_url: userInfo?.photo,
        email:      data.user.email,
      })
    }
    return data
  } catch (err: any) {
    if (err.code === statusCodes?.SIGN_IN_CANCELLED)        throw new Error('Sign in was cancelled')
    if (err.code === statusCodes?.IN_PROGRESS)              throw new Error('Sign in already in progress')
    if (err.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Play Services unavailable')
    throw err
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────
export async function signInWithGoogle() {
  if (isExpoGo || Platform.OS === 'web') return signInWithOAuthFallback()
  return signInNative()
}

export async function signOutGoogle() {
  if (!isExpoGo && Platform.OS !== 'web') {
    try {
      const pkg = await import('@react-native-google-signin/google-signin')
      await (pkg as any).GoogleSignin.signOut()
    } catch {
      // supabase signOut below handles the session regardless
    }
  }
  await supabase.auth.signOut()
}