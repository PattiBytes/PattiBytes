// src/app/_layout.tsx
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'   

import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'


Sentry.init({
  dsn: 'https://4ef63860fdb9b613ac4e538d599ee598@o4510964276723712.ingest.de.sentry.io/4510964283605072',
  debug: false,                        // set true temporarily to verify it works
  environment: process.env.APP_VARIANT ?? 'production',
  enableNativeFramesTracking: true,    // tracks slow/frozen frames
  tracesSampleRate: 0.2,              // 20% of sessions tracked (keeps free tier)
})

function extractOrderId(data: any): string | null {
  return data?.orderId ?? data?.order_id ?? null
}

function isOrderUpdate(data: any): boolean {
  if (data?.type === 'order_update') return true
  if (data?.type === 'order') return true
  return false
}

function RootGuard() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  const receivedRef = useRef<{ remove: () => void } | null>(null)
  const responseRef = useRef<{ remove: () => void } | null>(null)
  const lastPushUid = useRef<string | null>(null)

  const [isOffline, setIsOffline] = useState(false)
  const wasOffline = useRef(false)

  const inAuthGroup = segments[0] === '(auth)'
  const isOfflinePage = (segments as string[]).includes('offline')

  // Expo Go check: in SDK 53+, remote push via expo-notifications is not supported in Expo Go. [web:59]
  const isExpoGo = Constants.appOwnership === 'expo'

  // ── Network monitoring ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false
      setIsOffline(offline)

      if (offline && !wasOffline.current) {
        wasOffline.current = true
        router.replace('/offline' as any)
      } else if (!offline && wasOffline.current) {
        wasOffline.current = false
        if (isOfflinePage) {
          if (!user) router.replace('/(auth)/login' as any)
          else {
            const role = profile?.role ?? 'customer'
            router.replace(role === 'driver' ? '/(driver)/dashboard' : '/(customer)/dashboard' as any)
          }
        }
      }
    })
    return () => unsub()
  }, [router, user, profile, isOfflinePage])

  // ── Notification handling (safe for Expo Go) ──────────────────────────
  useEffect(() => {
    if (isExpoGo) {
      // Avoid importing expo-notifications / registering remote push in Expo Go SDK 53+. [web:59]
      return
    }

    let removeTapListener: (() => void) | null = null
    let mounted = true

    const goToOrder = (orderId: string) => {
      router.push({ pathname: '/(customer)/orders/[id]', params: { id: orderId } } as any)
    }

    ;(async () => {
      // Lazy imports so Expo Go doesn’t crash at module import time. [web:59]
      const Notifications = await import('expo-notifications')
      const notif = await import('../lib/notificationHandler')

      // Run once (init sets handler + channels, etc.)
      notif.initNotificationHandler()

      // Cold start: opened from killed state [web:45]
      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && mounted) {
        const data = last.notification.request.content.data as any
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
      }

      // Listener via your wrapper (kept for compatibility with your existing code)
      receivedRef.current = notif.addReceivedListener(() => {})

      responseRef.current = notif.addResponseListener((res: any) => {
        const data = res?.notification?.request?.content?.data ?? {}
        const orderId = extractOrderId(data)

        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
        if (data?.type === 'new_order') router.push('/(driver)/dashboard' as any)
      })

      // Also add direct tap listener (extra safety)
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data ?? {}
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
      })
      removeTapListener = () => sub.remove()
    })()

    return () => {
      mounted = false
      receivedRef.current?.remove()
      responseRef.current?.remove()
      removeTapListener?.()
    }
  }, [router, isExpoGo])

  // ── Register push once per user (only in dev/prod build) ──────────────
  useEffect(() => {
    if (isExpoGo) return // Expo Go SDK 53+ can’t do remote push token. [web:59]
    if (!user?.id) return
    if (lastPushUid.current === user.id) return
    lastPushUid.current = user.id

    ;(async () => {
      const notif = await import('../lib/notificationHandler')
      await notif.registerForPushNotifications(user.id)
    })()
  }, [user?.id, isExpoGo])

  useEffect(() => {
  if (user?.id) {
    Sentry.setUser({
      id: user.id,
      email: user.email ?? undefined,
    })
  } else {
    Sentry.setUser(null)   // clear on logout
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id])

  // ── Role-based routing guard ──────────────────────────────────────────
  useEffect(() => {
    if (loading || isOffline) return

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login' as any)
      return
    }

    if (!profile) return

    if (!profile.is_active || profile.account_status === 'banned') {
      supabase.auth.signOut()
      router.replace('/(auth)/login' as any)
      return
    }

    const role = profile.role ?? 'customer'
    const approval = profile.approval_status ?? 'approved'

    if (['driver', 'merchant', 'admin', 'superadmin'].includes(role) && approval === 'pending') {
      if (segments[1] !== 'pending-approval') router.replace('/(auth)/pending-approval' as any)
      return
    }

    if (approval === 'rejected') {
      router.replace('/(auth)/login' as any)
      return
    }

    if (inAuthGroup) {
      router.replace(role === 'driver' ? '/(driver)/dashboard' : '/(customer)/dashboard' as any)
    }
  }, [loading, user, profile, inAuthGroup, segments, router, isOffline])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return <Slot />
}

function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <RootGuard />
      </CartProvider>
    </AuthProvider>
  )
}
export default Sentry.wrap(RootLayout)