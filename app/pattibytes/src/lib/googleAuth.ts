import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from './supabase'
// ✅ FIXED: was incorrectly imported from './notifications'
import { isExpoGo } from './notificationHandler'

WebBrowser.maybeCompleteAuthSession()

// ─── Ensure profile row exists after OAuth ───────────────────────────────────
async function ensureProfile(
  userId: string,
  meta?: { fullname?: string | null; avatarurl?: string | null }
) {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (error?.code === 'PGRST116') {
      // Row not found → create it
      const { error: insertErr } = await supabase.from('profiles').upsert({
        id: userId,
        fullname: meta?.fullname ?? 'User',
        username: null,          // ✅ added – prevents NOT NULL violations
        avatarurl: meta?.avatarurl ?? null,
        role: 'customer',
        approvalstatus: 'approved',
        isactive: true,
        profilecompleted: false,
      })
      if (insertErr) console.warn('[googleAuth] ensureProfile upsert:', insertErr.message)
    }
  } catch (e: any) {
    console.warn('[googleAuth] ensureProfile:', e.message)
  }
}

// ─── Redirect URI (used in Expo Go / web fallback) ──────────────────────────
export function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'pattibytesexpress',
    path: 'auth/callback',
  })
}

// ─── OAuth web/browser fallback (Expo Go + web) ──────────────────────────────
async function signInWithOAuthFallback() {
  const redirectUri = getRedirectUri()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
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
      fullname: sessionData.user.user_metadata?.full_name,
      avatarurl: sessionData.user.user_metadata?.avatar_url,
    })
  }
  return sessionData
}

// ─── Native Google Sign-In (Android / iOS in prod) ───────────────────────────
async function signInNative() {
  // Lazy-import to avoid crashing in Expo Go
  const pkg = await import('@react-native-google-signin/google-signin')
  const { GoogleSignin, statusCodes } = pkg as any

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,   // required
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,   // recommended
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  })

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    await GoogleSignin.signOut() // Force account picker on each sign-in

    const info = await GoogleSignin.signIn()
    const idToken: string | undefined =
      info?.data?.idToken ?? info?.idToken
    if (!idToken) throw new Error('No ID token returned from Google.')

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error

    // Grab user details from sign-in info
    const userInfo = info?.data?.user ?? info?.user
    if (data?.user) {
      await ensureProfile(data.user.id, {
        fullname: userInfo?.name,
        avatarurl: userInfo?.photo,
      })
    }
    return data
  } catch (err: any) {
    if (err.code === statusCodes?.SIGN_IN_CANCELLED)
      throw new Error('Sign in was cancelled')
    if (err.code === statusCodes?.IN_PROGRESS)
      throw new Error('Sign in already in progress')
    if (err.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE)
      throw new Error('Play Services unavailable')
    throw err
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────
export async function signInWithGoogle() {
  // Expo Go or web → use browser-based OAuth
  if (isExpoGo || Platform.OS === 'web') return signInWithOAuthFallback()
  return signInNative()
}

export async function signOutGoogle() {
  if (!isExpoGo && Platform.OS !== 'web') {
    try {
      const pkg = await import('@react-native-google-signin/google-signin')
      await (pkg as any).GoogleSignin.signOut()
    } catch {
      // ignore – supabase sign-out below handles session
    }
  }
  await supabase.auth.signOut()
}
