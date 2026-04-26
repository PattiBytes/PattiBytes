/* eslint-disable react-hooks/exhaustive-deps */
// src/app/_layout.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, View, LogBox, Modal,
  Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
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
import { ThemeProvider, useColors, useTheme } from '../contexts/ThemeContext'  // ← useTheme added
import { supabase } from '../lib/supabase'
import {
  initNotificationHandler,
  registerForPushNotifications,
  addReceivedListener,
  addResponseListener,
  setupForegroundReregistration,
} from '../lib/notificationHandler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ScrollToTopProvider, BackToTopFab } from '../components/ui/ScrollToTop'
import { useAppUpdate } from '@/hooks/useAppUpdate'
import { needsProfileCompletion } from '../lib/apple'


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

const DISCLOSURE_KEY = 'bg_location_disclosure_shown'

const GUEST_BROWSEABLE_PAGES = new Set([
  'dashboard', 'restaurant', 'menu', 'shop', 'store',
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
    default:            return '/(customer)/dashboard'
  }
}


// ── Background Location Disclosure ───────────────────────────────────────────
interface DisclosureProps {
  visible:   boolean
  onAccept:  () => void
  onDecline: () => void
}

function BackgroundLocationDisclosure({ visible, onAccept, onDecline }: DisclosureProps) {
  const colors = useColors()   // themed icon + buttons + sheet bg + text

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={dlStyles.overlay}>
        {/* sheet bg is themed via inline override — dlStyles has no backgroundColor */}
        <View style={[dlStyles.sheet, { backgroundColor: colors.card }]}>
          <View style={[dlStyles.iconWrapper, { backgroundColor: colors.backgroundLight }]}>
            <Ionicons name="location" size={32} color={colors.primary} />
          </View>

          {/* Title — themed text */}
          <Text style={[dlStyles.title, { color: colors.text }]}>
            Location Access Required
          </Text>

          <ScrollView style={dlStyles.scroll} showsVerticalScrollIndicator={false}>
            {/* Body — themed text */}
            <Text style={[dlStyles.body, { color: colors.textLight }]}>
              <Text style={dlStyles.bold}>Pattibytes Express</Text> collects location
              data to enable the following features:
            </Text>

            <View style={dlStyles.featureRow}>
              <Ionicons name="navigate-circle" size={18} color={colors.primary} />
              <Text style={[dlStyles.featureText, { color: colors.textLight }]}>
                <Text style={dlStyles.bold}>Real-time delivery tracking</Text> — your
                delivery driver&apos;s location is tracked continuously so you can follow
                your order live on the map, even when the app is in the background
                or the screen is off.
              </Text>
            </View>

            <View style={dlStyles.featureRow}>
              <Ionicons name="restaurant" size={18} color={colors.primary} />
              <Text style={[dlStyles.featureText, { color: colors.textLight }]}>
                <Text style={dlStyles.bold}>Nearby restaurants</Text> — your location
                is used to show restaurants in your area and calculate delivery fees.
              </Text>
            </View>

            <View style={[dlStyles.notice, {
              borderLeftColor:   colors.primary,
              backgroundColor:   colors.backgroundLight,
            }]}>
              <Text style={[dlStyles.noticeText, { color: colors.textLight }]}>
                📍 <Text style={dlStyles.bold}>Background location</Text> is used
                only during active deliveries to update the live tracking map.
                It is never collected in the background outside of an active order.
                Location data is not shared with third parties.
              </Text>
            </View>

            {/* Sub-text — textMuted */}
            <Text style={[dlStyles.subText, { color: colors.textMuted }]}>
              You can change location permissions anytime in your device Settings.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[dlStyles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={onAccept}
          >
            <Text style={dlStyles.acceptText}>Allow Location Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={dlStyles.declineBtn} onPress={onDecline}>
            <Text style={[dlStyles.declineText, { color: colors.textMuted }]}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// Only non-colour structural styles here — all colours injected inline above
const dlStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    // NO backgroundColor here — injected inline so it follows the active theme
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 40, maxHeight: '85%',
  },
  iconWrapper: { alignSelf: 'center', borderRadius: 50, padding: 14, marginBottom: 16 },
  title:       { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  scroll:      { maxHeight: 280, marginBottom: 20 },
  body:        { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  bold:        { fontWeight: '700' },
  featureRow:  { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  featureText: { fontSize: 14, lineHeight: 22, flex: 1 },
  notice:      { borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 12, borderLeftWidth: 3 },
  noticeText:  { fontSize: 13, lineHeight: 20 },
  subText:     { fontSize: 12, textAlign: 'center', marginTop: 4 },
  acceptBtn:   { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  acceptText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  declineBtn:  { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  declineText: { fontSize: 15 },
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
  // ← useTheme() instead of useColors() so we get isDark for StatusBar
  const { colors, isDark } = useTheme()
  const router   = useRouter()
  const segments = useSegments()

  const subsRef         = useRef<Map<string, { remove: () => void }>>(new Map())
  const [isOffline, setIsOffline] = useState(false)
  const wasOffline      = useRef(false)
  const rejectedAlerted = useRef(false)

  const inAuthGroup   = segments[0] === '(auth)'
  const isLegalPage   = (segments[0] as string) === 'legal'
  const isOfflinePage = (segments as string[]).includes('offline')
  const isExpoGo      = Constants.appOwnership === 'expo'

  const isCompleteProfileScreen =
    segments[0] === '(auth)' && (segments[1] as string) === 'complete-profile'

  const [profileTimedOut, setProfileTimedOut] = useState(false)

  const updateCheckReady = (
    !loading && !isOffline && !inAuthGroup && !isLegalPage &&
    !isOfflinePage && !!user && !!profile && !!profile.profile_completed
  )
  useAppUpdate(updateCheckReady)

  const { showDisclosure, onAccept, onDecline } =
    useBackgroundLocationDisclosure(updateCheckReady)

  useEffect(() => {
    if (!user || profile) { setProfileTimedOut(false); return }
    const t = setTimeout(() => setProfileTimedOut(true), 3_000)
    return () => clearTimeout(t)
  }, [user, profile])

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
          if (user) router.replace(getDashboard(profile?.role ?? 'customer') as any)
          else      router.replace('/(customer)/dashboard' as any)
        }
      }
    })
    return () => unsub()
  }, [router, user, profile, isOfflinePage])

  useEffect(() => {
    if (!user?.id) return
    registerForPushNotifications(user.id).then(token => {
      if (token && __DEV__) console.log('[layout] Push token registered:', token)
    })
    const cleanupForeground = setupForegroundReregistration(user.id)
    const goToOrder = (orderId: string) => {
      router.push({ pathname: '/(customer)/orders/[id]', params: { id: orderId } } as any)
    }
    let mounted = true
    ;(async () => {
      if (isExpoGo) return
      const Notifications = await import('expo-notifications')
      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && mounted) {
        const data    = last.notification.request.content.data as any
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) goToOrder(orderId)
      }
      const recSub = addReceivedListener(n => {
        if (__DEV__) console.log('[layout] Notification received:', n?.request?.content?.title)
      })
      subsRef.current.set('received', recSub)
      const resSub = addResponseListener((res: any) => {
        const data    = res?.notification?.request?.content?.data ?? {}
        const orderId = extractOrderId(data)
        if (orderId && isOrderUpdate(data)) { goToOrder(orderId); return }
        if (data?.type === 'new_order') router.push('/(driver)/dashboard' as any)
      })
      subsRef.current.set('response', resSub)
    })()
    return () => {
      mounted = false
      subsRef.current.forEach(sub => sub.remove())
      subsRef.current.clear()
      cleanupForeground()
    }
  }, [user?.id, isExpoGo])

  useEffect(() => {
    if (user?.id) Sentry.setUser({ id: user.id, email: user.email ?? undefined })
    else          Sentry.setUser(null)
  }, [user?.id])

  useEffect(() => {
    if (loading || isOffline || isLegalPage) return
    const top = segments[0] as string | undefined
    if (!user) {
      rejectedAlerted.current = false
      if (inAuthGroup || isLegalPage || isOfflinePage) return
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
    if (!isCompleteProfileScreen && !profile.profile_completed) {
      const incomplete = needsProfileCompletion(profile.full_name, (profile as any).username)
      if (incomplete) { router.replace('/(auth)/complete-profile' as any); return }
    }
    if (!profile.is_active || (profile as any).account_status === 'banned') {
      supabase.auth.signOut()
      router.replace('/(auth)/login' as any)
      return
    }
    const role     = profile.role ?? 'customer'
    const approval = profile.approval_status ?? 'approved'
    if (['driver', 'merchant', 'admin', 'superadmin'].includes(role)) {
      if (approval === 'pending') {
        if (segments[1] !== 'pending-approval') router.replace('/(auth)/pending-approval' as any)
        return
      }
      if (approval === 'rejected') {
        if (!rejectedAlerted.current) {
          rejectedAlerted.current = true
          Alert.alert(
            'Application Not Approved',
            'Your role application was not approved. You can continue using the app as a customer. Contact support if you believe this is a mistake.',
            [{ text: 'OK', onPress: async () => { await supabase.auth.signOut(); router.replace('/(auth)/login' as any) } }],
            { cancelable: false },
          )
        }
        return
      }
    }
    if (inAuthGroup && !isCompleteProfileScreen) router.replace(getDashboard(role) as any)
  }, [loading, user, profile, profileTimedOut, inAuthGroup, isLegalPage,
      isCompleteProfileScreen, segments, router, isOffline])


  if (loading) {
    return (
      <SafeAreaView style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.backgroundLight,   // ← was '#fff'
      }}>
        {/* ← status bar icons follow dark/light mode of active theme */}
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <>
      {/* ← status bar icons invert when user is in dark mode */}
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
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
        {/* ThemeProvider outermost so every child (including AuthProvider) can useColors() */}
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <ScrollToTopProvider>
                <RootGuard />
              </ScrollToTopProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default Sentry.wrap(RootLayout)
