import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { isExpoGo } from './notifications'
import { savePushToken } from './profile'

export function init() {
  if (isExpoGo) return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

export function addReceivedListener(cb: (n: Notifications.Notification) => void) {
  if (isExpoGo) return { remove: () => {} }
  return Notifications.addNotificationReceivedListener(cb)
}

export function addResponseListener(
  cb: (r: Notifications.NotificationResponse) => void
) {
  if (isExpoGo) return { remove: () => {} }
  return Notifications.addNotificationResponseReceivedListener(cb)
}

export async function registerForPush(userId: string): Promise<string | null> {
  if (!Device.isDevice || isExpoGo) return null
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? ''
    if (!projectId) return null
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    await savePushToken(userId, token)
    return token
  } catch {
    return null
  }
}
