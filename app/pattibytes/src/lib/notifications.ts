// src/lib/notifications.ts
import Constants from 'expo-constants'

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'
