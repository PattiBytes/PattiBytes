// src/lib/notificationHandler.ts
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

export const isExpoGo = Constants.appOwnership === 'expo'
export const canUsePush = Device.isDevice && !isExpoGo

function getNotificationsModule() {
  if (!canUsePush) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof import('expo-notifications')
  } catch {
    return null
  }
}

let inited = false
export function initNotificationHandler() {
  if (!canUsePush || inited) return
  inited = true
  const N = getNotificationsModule()
  if (!N) return

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
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
  }
}

export function addReceivedListener(cb: (n: any) => void) {
  const N = getNotificationsModule()
  if (!N) return { remove: () => {} }
  const sub = N.addNotificationReceivedListener(cb)
  return { remove: () => sub.remove() }
}

export function addResponseListener(cb: (r: any) => void) {
  const N = getNotificationsModule()
  if (!N) return { remove: () => {} }
  const sub = N.addNotificationResponseReceivedListener(cb)
  return { remove: () => sub.remove() }
}

export async function registerForPushNotifications(userId: string) {
  if (!canUsePush) return null
  const N = getNotificationsModule()
  if (!N) return null

  initNotificationHandler()

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'default',
      importance: N.AndroidImportance.MAX,
    }).catch(() => {})
  }

  const perm = await N.getPermissionsAsync()
  let granted = perm.granted
  if (!granted) {
    const req = await N.requestPermissionsAsync()
    granted = req.granted
  }
  if (!granted) return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId

  if (!projectId) return null

  const token = (await N.getExpoPushTokenAsync({ projectId })).data

  // ✅ IMPORTANT: must match Edge Function query/table
 await supabase.from('devicepushtokens').upsert(
  {
    userid: userId,
    expopushtoken: token,
    platform: Platform.OS,
    updatedat: new Date().toISOString(),
  },
  { onConflict: 'expopushtoken' }
)


  return token
}
