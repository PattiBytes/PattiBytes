import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import { supabase } from './supabase'
import { isExpoGo } from './notifications'

WebBrowser.maybeCompleteAuthSession()

async function ensureProfile(
  userId: string,
  meta?: { full_name?: string | null; avatar_url?: string | null }
) {
  try {
    const { error } = await supabase.from('profiles').select('id').eq('id', userId).single()
    if (error?.code === 'PGRST116') {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: meta?.full_name || 'User',
        avatar_url: meta?.avatar_url || null,
        role: 'customer',
        approval_status: 'approved',
        is_active: true,
        profile_completed: false,
      })
    }
  } catch { /* safe */ }
}

function getRedirectUri(): string {
  if (isExpoGo) return AuthSession.makeRedirectUri()
  return AuthSession.makeRedirectUri({
    scheme: 'pattibytesexpress',
    path: 'auth/callback',
  })
}

async function signInWithOAuth(): Promise<any> {
  const redirectUri = getRedirectUri()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account', access_type: 'offline' },
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Could not start Google sign-in.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri, {
    showInRecents: true,
    preferEphemeralSession: false,
  })

  if (result.type === 'cancel' || result.type === 'dismiss')
    throw new Error('Sign in was cancelled')
  if (result.type !== 'success')
    throw new Error('Google sign-in failed. Please try again.')

  const { url } = result as WebBrowser.WebBrowserRedirectResult

  // Try PKCE code exchange first
  try {
    const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(url)
    if (sessionError) throw sessionError
    if (session?.user) {
      await ensureProfile(session.user.id, {
        full_name: session.user.user_metadata?.full_name,
        avatar_url: session.user.user_metadata?.avatar_url,
      })
    }
    return session
  } catch {
    // Fallback: parse tokens from URL hash (implicit flow)
    const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? ''
    const params   = new URLSearchParams(fragment)
    const access_token  = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token)
      throw new Error('Auth failed — no token in redirect. Add exp://** to Supabase Redirect URLs.')

    const { data: s, error: setErr } = await supabase.auth.setSession({ access_token, refresh_token })
    if (setErr) throw setErr
    if (s?.user) {
      await ensureProfile(s.user.id, {
        full_name: s.user.user_metadata?.full_name,
        avatar_url: s.user.user_metadata?.avatar_url,
      })
    }
    return s
  }
}

// ── Native Google Sign-In (uses import() — no require()) ─────────────────
async function signInNative(): Promise<any> {
  // Dynamic import() is allowed by ESLint — no require() used
  const pkg = await import('@react-native-google-signin/google-signin')
  const { GoogleSignin, statusCodes } = pkg as any

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  })

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    await GoogleSignin.signOut() // Force account picker
    const info    = await GoogleSignin.signIn()
    const idToken = info?.data?.idToken ?? info?.idToken
    if (!idToken) throw new Error('No ID token from Google.')

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error

    const userInfo = info?.data?.user ?? info?.user
    if (data.user) {
      await ensureProfile(data.user.id, {
        full_name: userInfo?.name,
        avatar_url: userInfo?.photo,
      })
    }
    return data
  } catch (err: any) {
    if (err.code === statusCodes?.SIGN_IN_CANCELLED)  throw new Error('Sign in was cancelled')
    if (err.code === statusCodes?.IN_PROGRESS)        throw new Error('Sign in already in progress')
    if (err.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Play Services unavailable')
    throw err
  }
}

export async function signInWithGoogle(): Promise<any> {
  if (isExpoGo || Platform.OS === 'web') return signInWithOAuth()
  try {
    return await signInNative()
  } catch (err: any) {
    const msg = err?.message ?? ''
    if (
      msg.includes('RNGoogleSignin') || msg.includes('TurboModule') ||
      msg.includes('not found')      || msg.includes('NativeModule')
    ) {
      return signInWithOAuth() // native module not linked yet — graceful fallback
    }
    throw err
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!isExpoGo && Platform.OS !== 'web') {
    try {
      const pkg = await import('@react-native-google-signin/google-signin')
      await (pkg as any).GoogleSignin.signOut()
    } catch { /* ignore */ }
  }
  await supabase.auth.signOut()
}
