import React, { useEffect, useRef } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'
import {
  init,
  addReceivedListener,
  addResponseListener,
  registerForPush,
} from '../lib/notificationHandler'

// Safe on all platforms — web stub is a no-op, native runs only on device
init()

function RootGuard() {
  const { user, profile, loading } = useAuth()
  const router   = useRouter()
  const segments = useSegments()
  const receivedRef = useRef<{ remove: () => void } | null>(null)
  const responseRef = useRef<{ remove: () => void } | null>(null)

  // segments[0] keeps the group name with parentheses: '(auth)', '(customer)', '(driver)'
  const inAuthGroup = segments[0] === '(auth)'

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

  // ── Register push token once logged in ───────────────────────────────
  useEffect(() => {
    if (user?.id) registerForPush(user.id)
  }, [user?.id])

  // ── Role-based routing guard ──────────────────────────────────────────
  useEffect(() => {
    if (loading) return

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login' as any)
      return
    }

    // Profile still loading — wait
    if (!profile) return

    // Deactivated / banned account
    if (!profile.is_active || profile.account_status === 'banned') {
      supabase.auth.signOut()
      router.replace('/(auth)/login' as any)
      return
    }

    const role     = profile.role            ?? 'customer'
    const approval = profile.approval_status ?? 'approved'

    // Pending manual approval (drivers, merchants, admins)
    if (
      ['driver', 'merchant', 'admin', 'superadmin'].includes(role) &&
      approval === 'pending'
    ) {
      if (segments[1] !== 'pending-approval')
        router.replace('/(auth)/pending-approval' as any)
      return
    }

    // Rejected
    if (approval === 'rejected') {
      router.replace('/(auth)/login' as any)
      return
    }

    // On an auth screen → redirect to correct home
    if (inAuthGroup) {
      router.replace(
        role === 'driver'
          ? '/(driver)/dashboard'
          : '/(customer)/dashboard' as any
      )
    }
  }, [loading, user, profile, inAuthGroup, segments, router])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
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
