/* eslint-disable @typescript-eslint/no-require-imports */
// src/lib/notificationHandler.ts
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'

export const canUsePush =
  Device.isDevice &&
  !isExpoGo

function getN(): any | null {
  if (isExpoGo) return null
  try {
    return require('expo-notifications')
  } catch {
    return null
  }
}

let _inited = false

export function initNotificationHandler(): void {
  if (isExpoGo || _inited) return
  _inited = true
  const N = getN()
  if (!N) return
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
  if (Platform.OS === 'android') {
    N.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: N.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    }).catch(() => {})
    N.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Offers',
      importance: N.AndroidImportance.DEFAULT,
      sound: 'default',
    }).catch(() => {})
    N.setNotificationChannelAsync('default', {
      name: 'General',
      importance: N.AndroidImportance.DEFAULT,
      sound: 'default',
    }).catch(() => {})
  }
}

export function addReceivedListener(cb: (n: any) => void): { remove: () => void } {
  const N = getN()
  if (!N) return { remove: () => {} }
  try {
    const sub = N.addNotificationReceivedListener(cb)
    return { remove: () => sub.remove() }
  } catch {
    return { remove: () => {} }
  }
}

export function addResponseListener(cb: (r: any) => void): { remove: () => void } {
  const N = getN()
  if (!N) return { remove: () => {} }
  try {
    const sub = N.addNotificationResponseReceivedListener(cb)
    return { remove: () => sub.remove() }
  } catch {
    return { remove: () => {} }
  }
}

export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  if (!Device.isDevice || isExpoGo) return null
  const N = getN()
  if (!N) return null
  initNotificationHandler()
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'default',
        importance: N.AndroidImportance.MAX,
      })
    }
    const { status: existing } = await N.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ?? ''
    if (!projectId) {
      console.warn('[push] No EAS projectId in Constants')
      return null
    }

    const token = (await N.getExpoPushTokenAsync({ projectId })).data

    const { supabase } = require('../lib/supabase')

    // Save to device_push_tokens table
    await supabase.from('device_push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' }
    )

    // Also keep push_token on profiles for quick lookups
    await supabase
      .from('profiles')
      .update({
        push_token: token,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    return token
  } catch (e) {
    console.warn('[push] registerForPushNotifications failed:', e)
    return null
  }
}
