// src/hooks/useSessionAnalytics.ts
// ─────────────────────────────────────────────────────────────────────────────
// Call logDeviceSession(userId) once per auth session (ThemeContext does this).
// • Upserts a row in user_devices (one per user+platform+device_model combo)
// • Inserts a row in user_sessions (one per login event)
// • Sets profiles.first_login_at exactly once (on first-ever login)
// • Updates profiles.last_seen_at, last_platform, last_app_version, last_device
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native'
import Constants    from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase }  from '../lib/supabase'

const PUSH_TOKEN_KEY = 'expo_push_token'

async function getPushToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(PUSH_TOKEN_KEY) }
  catch { return null }
}

export async function logDeviceSession(userId: string): Promise<void> {
  try {
    const platform    = Platform.OS                                  // ios | android | web
    const appVersion  = Constants.expoConfig?.version ?? '1.0.0'
    const deviceModel = (Constants.deviceName ?? 'unknown').slice(0, 80)
    const pushToken   = await getPushToken()
    const now         = new Date().toISOString()

    // ── 1. Fetch profile to check first_login_at ──────────────────────────
    const { data: prof } = await supabase
      .from('profiles')
      .select('first_login_at')
      .eq('id', userId)
      .single()

    const isFirstLogin = !prof?.first_login_at

    // ── 2. Update profiles row ────────────────────────────────────────────
    const profileUpdate: Record<string, unknown> = {
      last_platform:    platform,
      last_app_version: appVersion,
      last_device:      deviceModel,
      last_seen_at:     now,
    }
    if (isFirstLogin) profileUpdate.first_login_at = now

    supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)
      .then(({ error }) => {
        if (error && __DEV__) console.warn('[analytics] profiles update:', error.message)
      })

    // ── 3. Upsert device row — increment session_count, update last_seen ──
    // Mark all existing rows for this user as is_current = false first
    supabase
      .from('user_devices')
      .update({ is_current: false })
      .eq('user_id', userId)
      .then(() => {
        // Then upsert the current device
        supabase
          .from('user_devices')
          .upsert(
            {
              user_id:      userId,
              platform,
              device_model: deviceModel,
              app_version:  appVersion,
              push_token:   pushToken,
              last_seen:    now,
              is_current:   true,
              // session_count incremented via DB trigger below, or manually:
              // Supabase does not natively support increment in upsert,
              // so we use a raw SQL RPC (see migration for the function).
            },
            { onConflict: 'user_id,platform,device_model' },
          )
          .then(({ error }) => {
            if (error && __DEV__) console.warn('[analytics] device upsert:', error.message)
          })
      })

    // ── 4. Insert session event ───────────────────────────────────────────
    supabase
      .from('user_sessions')
      .insert({
        user_id:        userId,
        platform,
        device_model:   deviceModel,
        app_version:    appVersion,
        push_token:     pushToken,
        is_first_login: isFirstLogin,
        login_at:       now,
      })
      .then(({ error }) => {
        if (error && __DEV__) console.warn('[analytics] session insert:', error.message)
      })

  } catch (e) {
    // Never crash the app for analytics failures
    if (__DEV__) console.warn('[analytics] logDeviceSession error:', e)
  }
}
