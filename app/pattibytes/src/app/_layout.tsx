// src/app/_layout.tsx
import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View, LogBox } from 'react-native'

import { Slot, useRouter, useSegments } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'

import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'
import { initNotificationHandler } from '../lib/notificationHandler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ScrollToTopProvider, BackToTopFab } from '../components/ui/ScrollToTop'

Sentry.init({
  dsn: 'https://4ef63860fdb9b613ac4e538d599ee598@o4510964276723712.ingest.de.sentry.io/4510964283605072',
  debug: false,
  environment: process.env.APP_VARIANT ?? 'production',
  enableNativeFramesTracking: true,
  tracesSampleRate: 0.2,
})

LogBox.ignoreLogs([
  'MapLibre [info] Request failed due to a permanent error: Canceled',
  'Mbgl-HttpRequest',
])

// ✅ Init notification handler ONCE at module level
initNotificationHandler()

function extractOrderId(data: any): string | null {
  return data?.orderId ?? data?.order_id ?? null
}

function isOrderUpdate(data: any): boolean {
  return data?.type === 'order_update' || data?.type === 'order'
}

function RootGuard() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  const receivedRef = useRef<{ remove: () => void } | null>(null)
  const responseRef = useRef<{ remove: () => void } | null>(null)

  const [isOffline, setIsOffline] = useState(false)
  const wasOffline = useRef(false)

  const inAuthGroup  = segments[0] === '(auth)'
  // ✅ Legal pages are public — never block or redirect /legal/[slug]
  const isLegalPage  = (segments[0] as string) === 'legal'
  const isOfflinePage = (segments as string[]).includes('offline')
  const isExpoGo = Constants.appOwnership === 'expo'

  // ── Network monitoring ──────────────────────────────────────────────────
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
            router.replace(
              role === 'driver'
                ? '/(driver)/dashboard'
                : '/(customer)/dashboard' as any
            )
          }
        }
      }
    })
    return () => unsub()
  }, [router, user, profile, isOfflinePage])

  // ── Notification tap/response listeners ────────────────────────────────
  useEffect(() => {
    if (isExpoGo) return

    let removeTapListener: (() => void) | null = null
    let mounted = true

    const goToOrder = (orderId: string) => {
      router.push({
        pathname: '/(customer)/orders/[id]',
        params: { id: orderId },
      } as any)
    }

    ;(async () => {
      const Notifications = await import('expo-notifications')
      const notif = await import('../lib/notificationHandler')

      // Cold start: app opened from killed state via notification tap
      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && mounted) {
        const data = last.notification.request.content.data as any
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
      }

      receivedRef.current = notif.addReceivedListener(() => {})

      responseRef.current = notif.addResponseListener((res: any) => {
        const data = res?.notification?.request?.content?.data ?? {}
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
        if (data?.type === 'new_order') router.push('/(driver)/dashboard' as any)
      })

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

  // ── Sentry user context ─────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({ id: user.id, email: user.email ?? undefined })
    } else {
      Sentry.setUser(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Role-based routing guard ────────────────────────────────────────────
  useEffect(() => {
    if (loading || isOffline) return

    // ✅ Never redirect away from public legal pages — no auth required
    if (isLegalPage) return

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

    const role     = profile.role ?? 'customer'
    const approval = profile.approval_status ?? 'approved'

    if (
      ['driver', 'merchant', 'admin', 'superadmin'].includes(role) &&
      approval === 'pending'
    ) {
      if (segments[1] !== 'pending-approval')
        router.replace('/(auth)/pending-approval' as any)
      return
    }

    if (approval === 'rejected') {
      router.replace('/(auth)/login' as any)
      return
    }

    if (inAuthGroup) {
      router.replace(
        role === 'driver'
          ? '/(driver)/dashboard'
          : '/(customer)/dashboard' as any
      )
    }
  }, [loading, user, profile, inAuthGroup, isLegalPage, segments, router, isOffline])

  if (loading) {
    return (
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
      }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return <Slot />
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <ScrollToTopProvider>
              <RootGuard />
              <BackToTopFab />
            </ScrollToTopProvider>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default Sentry.wrap(RootLayout)