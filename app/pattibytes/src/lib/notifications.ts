import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { savePushToken } from './profile'

// Works for Expo SDK 53+
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'

// Called at module-level in _layout.tsx — exits early in Expo Go
// so expo-notifications is NEVER required, its side-effects never run
export function initNotificationHandler(): void {
  if (isExpoGo) return
  try {
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require('expo-notifications')
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  } catch {}
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice || isExpoGo) return null
  try {
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require('expo-notifications')
    const { status: existing } = await N.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? ''
    if (!projectId) return null
    const token = (await N.getExpoPushTokenAsync({ projectId })).data
    await savePushToken(userId, token)
    return token
  } catch {
    return null
  }
}
