// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'
// src/app/_layout.tsx — change this import:
import {
  initNotificationHandler,
  addReceivedListener,
  addResponseListener,
  registerForPushNotifications,
} from '../lib/notificationHandler'


// Run once at module level — safe (exits early in Expo Go)
initNotificationHandler()

function RootGuard() {
  const { user, profile, loading } = useAuth()
  const router   = useRouter()
  const segments = useSegments()

  const receivedRef     = useRef<{ remove: () => void } | null>(null)
  const responseRef     = useRef<{ remove: () => void } | null>(null)
  const lastPushUid     = useRef<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const wasOffline      = useRef(false)

  const inAuthGroup = segments[0] === '(auth)'
  const isOfflinePage = (segments as string[]).includes('offline')

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
        // Navigate back to appropriate screen after reconnection
        if (isOfflinePage) {
          if (!user) {
            router.replace('/(auth)/login' as any)
          } else {
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

  // ── Notification listeners ────────────────────────────────────────────
  useEffect(() => {
    receivedRef.current = addReceivedListener(() => {})
    responseRef.current = addResponseListener((res: any) => {
      const data = res?.notification?.request?.content?.data ?? {}
      if (data.type === 'order_update' && data.orderId)
        router.push(`/(customer)/orders/${data.orderId}` as any)
      if (data.type === 'new_order')
        router.push('/(driver)/dashboard' as any)
    })
    return () => {
      receivedRef.current?.remove()
      responseRef.current?.remove()
    }
  }, [router])

  // ── Register push once per user ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    if (lastPushUid.current === user.id) return
    lastPushUid.current = user.id
    registerForPushNotifications(user.id)
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

    const role     = profile.role            ?? 'customer'
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
  }, [loading, user, profile, inAuthGroup, segments, router, isOffline])

  if (loading) {
    return (
      <View style={{
        flex: 1, alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#fff',
      }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <RootGuard />
      </CartProvider>
    </AuthProvider>
  )
}
