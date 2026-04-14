// src/hooks/useAppUpdate.ts
import { useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import * as Updates from 'expo-updates'

/**
 * Checks for an OTA update once per app session when the app is in a stable
 * state (authenticated user, online, not mid-navigation).
 *
 * - Does nothing in __DEV__ or Expo Go
 * - Shows a non-blocking Alert with "Later" / "Update Now"
 * - Never crashes the app if the update check fails
 */
export function useAppUpdate(enabled: boolean = true) {
  const checked = useRef(false)

  useEffect(() => {
    if (!enabled)         return   // caller controls when to run
    if (checked.current)  return   // only once per session
    if (__DEV__)          return   // never in dev / Expo Go

    checked.current = true

    ;(async () => {
      try {
        const result = await Updates.checkForUpdateAsync()
        if (!result.isAvailable) return

        Alert.alert(
          '🚀 Update Available',
          'A new version of PattiBytes Express is ready with the latest fixes and improvements.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              style: 'default',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync()
                  await Updates.reloadAsync()
                } catch {
                  Alert.alert(
                    'Update Failed',
                    'Could not apply the update. Please restart the app manually.',
                  )
                }
              },
            },
          ],
          { cancelable: true },
        )
      } catch {
        // silently ignore — network error, timeout, etc.
      }
    })()
  }, [enabled])
}
