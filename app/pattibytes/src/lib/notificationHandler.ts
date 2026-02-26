// src/lib/notificationHandler.ts
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// ✅ Expo Go guard — single source of truth
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'

export const canUsePush =
  Device.isDevice &&
  !(Platform.OS === 'android' && isExpoGo)

// ✅ Safe lazy loader — never runs expo-notifications in Expo Go
function getN(): any | null {
  if (isExpoGo) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
      shouldShowBanner: true,
      shouldShowList:   true,
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
  }
}

// ✅ These are the stubs _layout.tsx needs — safe no-ops in Expo Go
export function addReceivedListener(
  cb: (n: any) => void
): { remove: () => void } {
  const N = getN()
  if (!N) return { remove: () => {} }
  try {
    const sub = N.addNotificationReceivedListener(cb)
    return { remove: () => sub.remove() }
  } catch {
    return { remove: () => {} }
  }
}

export function addResponseListener(
  cb: (r: any) => void
): { remove: () => void } {
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
    const { status: existing } = await N.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ??
      ''
    if (!projectId) {
      console.warn('[push] No EAS projectId in Constants')
      return null
    }
    const token = (await N.getExpoPushTokenAsync({ projectId })).data
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabase } = require('../lib/supabase')
    await supabase.from('profiles')
      .update({ push_token: token, push_token_updated_at: new Date().toISOString() })
      .eq('id', userId)
    return token
  } catch (e) {
    console.warn('[push] registerForPushNotifications failed:', e)
    return null
  }
}
