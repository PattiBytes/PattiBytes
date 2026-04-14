// src/app/_layout.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, View, LogBox, Modal,
  Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'
import { initNotificationHandler } from '../lib/notificationHandler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ScrollToTopProvider, BackToTopFab } from '../components/ui/ScrollToTop'
import { useAppUpdate } from '@/hooks/useAppUpdate'


// ── Sentry ────────────────────────────────────────────────────────────────────

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

initNotificationHandler()


// ── Constants ─────────────────────────────────────────────────────────────────

const DISCLOSURE_KEY = 'bg_location_disclosure_shown'

/**
 * Pages inside /(customer)/* that a guest (unauthenticated) user may access.
 */
const GUEST_BROWSEABLE_PAGES = new Set([
  'dashboard',
  'restaurant',
  'menu',
  'shop',
  'store',
])


// ── Helpers ───────────────────────────────────────────────────────────────────

function extractOrderId(data: any): string | null {
  return data?.orderId ?? data?.order_id ?? null
}

function isOrderUpdate(data: any): boolean {
  return data?.type === 'order_update' || data?.type === 'order'
}

function getDashboard(role: string): string {
  switch (role) {
    case 'driver':     return '/(driver)/dashboard'
    case 'merchant':   return '/(merchant)/dashboard'
    case 'admin':
    case 'superadmin': return '/(admin)/dashboard'
    default:           return '/(customer)/dashboard'
  }
}


// ── Background Location Disclosure Modal ──────────────────────────────────────

interface DisclosureProps {
  visible: boolean
  onAccept: () => void
  onDecline: () => void
}

function BackgroundLocationDisclosure({ visible, onAccept, onDecline }: DisclosureProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={dlStyles.overlay}>
        <View style={dlStyles.sheet}>
          <View style={dlStyles.iconWrapper}>
            <Ionicons name="location" size={32} color="#FF6B35" />
          </View>

          <Text style={dlStyles.title}>Location Access Required</Text>

          <ScrollView style={dlStyles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={dlStyles.body}>
              <Text style={dlStyles.bold}>Pattibytes Express</Text> collects location
              data to enable the following features:
            </Text>

            <View style={dlStyles.featureRow}>
              <Ionicons name="navigate-circle" size={18} color="#FF6B35" />
              <Text style={dlStyles.featureText}>
                <Text style={dlStyles.bold}>Real-time delivery tracking</Text> — your
                delivery driver&apos;s location is tracked continuously so you can follow
                your order live on the map, even when the app is in the background
                or the screen is off.
              </Text>
            </View>

            <View style={dlStyles.featureRow}>
              <Ionicons name="restaurant" size={18} color="#FF6B35" />
              <Text style={dlStyles.featureText}>
                <Text style={dlStyles.bold}>Nearby restaurants</Text> — your location
                is used to show restaurants in your area and calculate delivery fees.
              </Text>
            </View>

            <View style={dlStyles.notice}>
              <Text style={dlStyles.noticeText}>
                📍 <Text style={dlStyles.bold}>Background location</Text> is used
                only during active deliveries to update the live tracking map.
                It is never collected in the background outside of an active order.
                Location data is not shared with third parties.
              </Text>
            </View>

            <Text style={dlStyles.subText}>
              You can change location permissions anytime in your device Settings.
            </Text>
          </ScrollView>

          <TouchableOpacity style={dlStyles.acceptBtn} onPress={onAccept}>
            <Text style={dlStyles.acceptText}>Allow Location Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={dlStyles.declineBtn} onPress={onDecline}>
            <Text style={dlStyles.declineText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const dlStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  iconWrapper: { alignSelf: 'center', backgroundColor: '#FFF0EA', borderRadius: 50, padding: 14, marginBottom: 16 },
  title:       { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 16 },
  scroll:      { maxHeight: 280, marginBottom: 20 },
  body:        { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 12 },
  bold:        { fontWeight: '700' },
  featureRow:  { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  featureText: { fontSize: 14, color: '#444', lineHeight: 22, flex: 1 },
  notice:      { backgroundColor: '#FFF7F4', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#FF6B35' },
  noticeText:  { fontSize: 13, color: '#555', lineHeight: 20 },
  subText:     { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4 },
  acceptBtn:   { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  acceptText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  declineBtn:  { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  declineText: { color: '#888', fontSize: 15 },
})


// ── useBackgroundLocationDisclosure ───────────────────────────────────────────

function useBackgroundLocationDisclosure(shouldRun: boolean) {
  const [showDisclosure, setShowDisclosure] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!shouldRun || checkedRef.current) return
    checkedRef.current = true

    ;(async () => {
      const { status: bg } = await Location.getBackgroundPermissionsAsync()
      if (bg === 'granted') return

      const seen = await AsyncStorage.getItem(DISCLOSURE_KEY)
      if (seen) return

      setShowDisclosure(true)
    })()
  }, [shouldRun])

  async function onAccept() {
    await AsyncStorage.setItem(DISCLOSURE_KEY, 'accepted')
    setShowDisclosure(false)
    const { status: fg } = await Location.requestForegroundPermissionsAsync()
    if (fg !== 'granted') return
    await Location.requestBackgroundPermissionsAsync()
  }

  async function onDecline() {
    await AsyncStorage.setItem(DISCLOSURE_KEY, 'declined')
    setShowDisclosure(false)
  }

  return { showDisclosure, onAccept, onDecline }
}


// ── RootGuard ─────────────────────────────────────────────────────────────────

function RootGuard() {
  const { user, profile, loading } = useAuth()
  const router   = useRouter()
  const segments = useSegments()

  const receivedRef = useRef<{ remove: () => void } | null>(null)
  const responseRef = useRef<{ remove: () => void } | null>(null)

  const [isOffline, setIsOffline] = useState(false)
  const wasOffline                = useRef(false)
  const rejectedAlerted           = useRef(false)

  const inAuthGroup   = segments[0] === '(auth)'
  const isLegalPage   = (segments[0] as string) === 'legal'
  const isOfflinePage = (segments as string[]).includes('offline')
  const isExpoGo      = Constants.appOwnership === 'expo'

  const [profileTimedOut, setProfileTimedOut] = useState(false)

  // ── OTA update check ─────────────────────────────────────────────────────
  // Fires once per session only when the app is in a stable, usable state:
  // user is authenticated, profile is loaded, not on auth/legal/offline screen.
  // The `enabled` flag is derived from all guard conditions below.
  const updateCheckReady = (
    !loading &&
    !isOffline &&
    !inAuthGroup &&
    !isLegalPage &&
    !isOfflinePage &&
    !!user &&
    !!profile
  )
  useAppUpdate(updateCheckReady)

  // Disclosure only fires for authenticated users on real screens
  const disclosureShouldRun = updateCheckReady
  const { showDisclosure, onAccept, onDecline } =
    useBackgroundLocationDisclosure(disclosureShouldRun)


  // ── Profile timeout ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || profile) { setProfileTimedOut(false); return }
    const t = setTimeout(() => setProfileTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [user, profile])


  // ── Network monitoring ────────────────────────────────────────────────────
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
          if (user) {
            const role = profile?.role ?? 'customer'
            router.replace(getDashboard(role) as any)
          } else {
            router.replace('/(customer)/dashboard' as any)
          }
        }
      }
    })
    return () => unsub()
  }, [router, user, profile, isOfflinePage])


  // ── Notification listeners ────────────────────────────────────────────────
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
      const notif         = await import('../lib/notificationHandler')

      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && mounted) {
        const data    = last.notification.request.content.data as any
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
      }

      receivedRef.current = notif.addReceivedListener(() => {})

      responseRef.current = notif.addResponseListener((res: any) => {
        const data    = res?.notification?.request?.content?.data ?? {}
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
        if (data?.type === 'new_order') router.push('/(driver)/dashboard' as any)
      })

      const sub = Notifications.addNotificationResponseReceivedListener(response => {
        const data    = response?.notification?.request?.content?.data ?? {}
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


  // ── Sentry user context ───────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({ id: user.id, email: user.email ?? undefined })
    } else {
      Sentry.setUser(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])


  // ── Role-based routing guard ──────────────────────────────────────────────
  useEffect(() => {
    if (loading || isOffline) return
    if (isLegalPage) return

    const top = segments[0] as string | undefined

    if (!user) {
      rejectedAlerted.current = false

      if (inAuthGroup)   return
      if (isLegalPage)   return
      if (isOfflinePage) return

      if (top === '(customer)') {
        const sub = segments[1] as string | undefined
        if (!sub || GUEST_BROWSEABLE_PAGES.has(sub)) return
      }

      router.replace('/(auth)/login' as any)
      return
    }

    if (!profile) {
      if (profileTimedOut && inAuthGroup) router.replace('/(customer)/dashboard' as any)
      return
    }

    if (!profile.is_active || profile.account_status === 'banned') {
      supabase.auth.signOut()
      router.replace('/(auth)/login' as any)
      return
    }

    const role     = profile.role ?? 'customer'
    const approval = profile.approval_status ?? 'approved'

    if (['driver', 'merchant', 'admin', 'superadmin'].includes(role)) {
      if (approval === 'pending') {
        if (segments[1] !== 'pending-approval')
          router.replace('/(auth)/pending-approval' as any)
        return
      }

      if (approval === 'rejected') {
        if (!rejectedAlerted.current) {
          rejectedAlerted.current = true
          Alert.alert(
            'Application Not Approved',
            'Your role application was not approved. You can continue using the app as a customer. Contact support if you believe this is a mistake.',
            [{
              text: 'OK',
              onPress: async () => {
                await supabase.auth.signOut()
                router.replace('/(auth)/login' as any)
              },
            }],
            { cancelable: false },
          )
        }
        return
      }
    }

    if (inAuthGroup) router.replace(getDashboard(role) as any)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile, profileTimedOut, inAuthGroup, isLegalPage, segments, router, isOffline])


  // ── Loading splash ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    )
  }

  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Slot />
      {!inAuthGroup && !isLegalPage && <BackToTopFab />}
      <BackgroundLocationDisclosure
        visible={showDisclosure}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </>
  )
}


// ── RootLayout ────────────────────────────────────────────────────────────────

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <ScrollToTopProvider>
              <RootGuard />
            </ScrollToTopProvider>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default Sentry.wrap(RootLayout)
