/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { navigateFromNotification } from '../services/notifications'
import {
  ActivityIndicator,
  Alert,
  View,
  LogBox,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  AppState,
  InteractionManager,
  type AppStateStatus,
} from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import * as Sentry from '@sentry/react-native'
import * as Location from 'expo-location'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import SplashGate from '../components/SplashGate'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { ThemeProvider, useColors, useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import {
  initNotificationHandler,
  addReceivedListener,
  addResponseListener,
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

const DISCLOSURE_KEY = 'bg_location_disclosure_shown'
const PROFILE_STALL_MS = 1500
const PRESENCE_PING_MS = 5 * 60 * 1000
const ACTION_TIMEOUT_MS = 8000
const AUTO_PROFILE_RETRY_MS = 4000
const DEFERRED_PRESENCE_BOOT_MS = 2200
const DEFERRED_NOTIFICATION_SETUP_MS = 900

const GUEST_BROWSEABLE_PAGES = new Set([
  'dashboard',
  'restaurant',
  'menu',
  'shop',
  'store',
])

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)

    promise
      .then(v => {
        clearTimeout(t)
        resolve(v)
      })
      .catch(e => {
        clearTimeout(t)
        reject(e)
      })
  })
}

function getDashboard(role?: string | null): string {
  switch (role) {
    case 'driver':
      return '/(driver)/dashboard'
    case 'merchant':
      return '/(merchant)/dashboard'
    case 'admin':
    case 'superadmin':
      return '/(admin)/dashboard'
    default:
      return '/(customer)/dashboard'
  }
}

function canBrowseAsGuest(segments: string[]): boolean {
  const top = segments[0]
  const sub = segments[1]

  if (!top) return true
  if (top !== '(customer)') return false
  if (!sub) return true

  return GUEST_BROWSEABLE_PAGES.has(sub)
}

function extractNotificationData(payload: any) {
  return (
    payload?.notification?.request?.content?.data ??
    payload?.request?.content?.data ??
    payload?.data ??
    {}
  )
}

function getNotificationType(payload: any): string {
  const data = extractNotificationData(payload)
  return String(data?.type ?? data?.notification_type ?? '').toLowerCase()
}

function getNotificationKey(payload: any): string | null {
  return (
    payload?.notification?.request?.identifier ??
    payload?.request?.identifier ??
    payload?.notification?.request?.content?.data?.notificationId ??
    payload?.notification?.request?.content?.data?.notification_id ??
    payload?.request?.content?.data?.notificationId ??
    payload?.request?.content?.data?.notification_id ??
    null
  )
}

function getDeviceLabel(): string {
  const parts = [
    Device.brand,
    Device.manufacturer,
    Device.modelName,
    Device.osName,
    Device.osVersion,
  ]
    .filter(Boolean)
    .map(v => String(v).trim())
    .filter(Boolean)

  return parts.join(' • ') || 'unknown-device'
}

function getAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    Constants.nativeBuildVersion ??
    'unknown'
  )
}

// ── Background Location Disclosure ───────────────────────────────────────────
interface DisclosureProps {
  visible: boolean
  onAccept: () => void
  onDecline: () => void
}

function BackgroundLocationDisclosure({
  visible,
  onAccept,
  onDecline,
}: DisclosureProps) {
  const colors = useColors()

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={dlStyles.overlay}>
        <View style={[dlStyles.sheet, { backgroundColor: colors.card }]}>
          <View style={[dlStyles.iconWrapper, { backgroundColor: colors.backgroundLight }]}>
            <Ionicons name="location" size={32} color={colors.primary} />
          </View>

          <Text style={[dlStyles.title, { color: colors.text }]}>
            Location Access Required
          </Text>

          <ScrollView style={dlStyles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[dlStyles.body, { color: colors.textLight }]}>
              <Text style={dlStyles.bold}>Pattibytes Express</Text> collects location
              data to enable the following features:
            </Text>

            <View style={dlStyles.featureRow}>
              <Ionicons name="navigate-circle" size={18} color={colors.primary} />
              <Text style={[dlStyles.featureText, { color: colors.textLight }]}>
                <Text style={dlStyles.bold}>Real-time delivery tracking</Text> — your
                delivery driver&apos;s location is tracked continuously so you can follow
                your order live on the map, even when the app is in the background or
                the screen is off.
              </Text>
            </View>

            <View style={dlStyles.featureRow}>
              <Ionicons name="restaurant" size={18} color={colors.primary} />
              <Text style={[dlStyles.featureText, { color: colors.textLight }]}>
                <Text style={dlStyles.bold}>Nearby restaurants</Text> — your location is
                used to show restaurants in your area and calculate delivery fees.
              </Text>
            </View>

            <View
              style={[
                dlStyles.notice,
                {
                  borderLeftColor: colors.primary,
                  backgroundColor: colors.backgroundLight,
                },
              ]}
            >
              <Text style={[dlStyles.noticeText, { color: colors.textLight }]}>
                📍 <Text style={dlStyles.bold}>Background location</Text> is used only
                during active deliveries to update the live tracking map. It is never
                collected in the background outside of an active order. Location data is
                not shared with third parties.
              </Text>
            </View>

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
            <Text style={[dlStyles.declineText, { color: colors.textMuted }]}>
              Not Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const dlStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 40,
    maxHeight: '85%',
  },
  iconWrapper: { alignSelf: 'center', borderRadius: 50, padding: 14, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  scroll: { maxHeight: 280, marginBottom: 20 },
  body: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: '700' },
  featureRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  featureText: { fontSize: 14, lineHeight: 22, flex: 1 },
  notice: { borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 12, borderLeftWidth: 3 },
  noticeText: { fontSize: 13, lineHeight: 20 },
  subText: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  acceptBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  declineBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  declineText: { fontSize: 15 },
})

function useBackgroundLocationDisclosure(shouldRun: boolean) {
  const [showDisclosure, setShowDisclosure] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!shouldRun) {
      checkedRef.current = false
      setShowDisclosure(false)
      return
    }

    if (checkedRef.current) return
    checkedRef.current = true

    ;(async () => {
      try {
        const { status: bg } = await Location.getBackgroundPermissionsAsync()
        if (bg === 'granted') return

        const seen = await AsyncStorage.getItem(DISCLOSURE_KEY)
        if (seen) return

        setShowDisclosure(true)
      } catch (e) {
        console.warn('[layout] disclosure check failed:', e)
      }
    })()
  }, [shouldRun])

  async function onAccept() {
    try {
      await AsyncStorage.setItem(DISCLOSURE_KEY, 'accepted')
    } catch {}

    setShowDisclosure(false)

    try {
      const { status: fg } = await Location.requestForegroundPermissionsAsync()
      if (fg !== 'granted') return
      await Location.requestBackgroundPermissionsAsync()
    } catch (e) {
      console.warn('[layout] location permission request failed:', e)
    }
  }

  async function onDecline() {
    try {
      await AsyncStorage.setItem(DISCLOSURE_KEY, 'declined')
    } catch {}
    setShowDisclosure(false)
  }

  return { showDisclosure, onAccept, onDecline }
}

// ── RootGuard ─────────────────────────────────────────────────────────────────
function RootGuard() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth()
  const { colors, isDark } = useTheme()
  const router = useRouter()
  const segments = useSegments() as string[]

  const subsRef = useRef<Map<string, { remove: () => void }>>(new Map())
  const [isOffline, setIsOffline] = useState(false)
  const [profileStalled, setProfileStalled] = useState(false)
  const [repairingProfile, setRepairingProfile] = useState(false)
  const [signingOutStalled, setSigningOutStalled] = useState(false)

  const wasOffline = useRef(false)
  const rejectedAlerted = useRef(false)
  const blockedAlerted = useRef(false)
  const lastHandledNotificationRef = useRef<string | null>(null)
  const lastPresenceWriteRef = useRef(0)
  const presenceBusyRef = useRef(false)

  const segmentKey = segments.join('/')
  const inAuthGroup = segments[0] === '(auth)'
  const isLegalPage = segments[0] === 'legal'
  const isOfflinePage = segments.includes('offline')
  const isExpoGo = Constants.appOwnership === 'expo'
  const isCompleteProfileScreen =
    segments[0] === '(auth)' && segments[1] === 'complete-profile'

  const role = String((profile as any)?.role ?? 'customer').toLowerCase()
  const approvalStatus = String(
    (profile as any)?.approval_status ?? (profile as any)?.approvalStatus ?? 'approved'
  ).toLowerCase()
  const profileCompleted = Boolean(
    (profile as any)?.profile_completed ?? (profile as any)?.profileCompleted ?? false
  )
  const isActiveProfile = Boolean(
    (profile as any)?.is_active ?? (profile as any)?.isActive ?? true
  )
  const accountStatus = String(
    (profile as any)?.account_status ?? (profile as any)?.accountStatus ?? 'active'
  ).toLowerCase()
  const fullName = String(
    (profile as any)?.full_name ?? (profile as any)?.fullname ?? ''
  ).trim()
  const username = String((profile as any)?.username ?? '').trim()
  const requiresProfileCompletion =
    !!profile && (!profileCompleted || needsProfileCompletion(fullName, username))

  const updateCheckReady =
    !loading &&
    !isOffline &&
    !inAuthGroup &&
    !isLegalPage &&
    !isOfflinePage &&
    !!user &&
    !!profile &&
    !requiresProfileCompletion

  useAppUpdate(updateCheckReady)

  const { showDisclosure, onAccept, onDecline } =
    useBackgroundLocationDisclosure(updateCheckReady)

  const mustBlockForProfile = useMemo(() => {
    if (!user) return false
    if (isOffline || isLegalPage || isOfflinePage) return false
    if (segments[0] === '(driver)' || segments[0] === '(merchant)' || segments[0] === '(admin)') {
      return true
    }
    if (inAuthGroup && !isCompleteProfileScreen) return true
    return !canBrowseAsGuest(segments)
  }, [
    user?.id,
    isOffline,
    isLegalPage,
    isOfflinePage,
    inAuthGroup,
    isCompleteProfileScreen,
    segmentKey,
  ])

  const shouldHoldForProtectedRedirect =
    !loading &&
    !isOffline &&
    !isLegalPage &&
    !isOfflinePage &&
    !user &&
    !inAuthGroup &&
    !canBrowseAsGuest(segments)

  const splashUser = mustBlockForProfile ? user : null
  const splashLoading =
    loading || (mustBlockForProfile && !!user && !profile && !profileStalled) || shouldHoldForProtectedRedirect

  const clearNotificationSubs = useCallback(() => {
    subsRef.current.forEach(sub => {
      try {
        sub.remove()
      } catch {}
    })
    subsRef.current.clear()
  }, [])

  const persistPresence = useCallback(
    async (force = false) => {
      if (!user?.id) return
      if (presenceBusyRef.current) return

      const now = Date.now()
      if (!force && now - lastPresenceWriteRef.current < PRESENCE_PING_MS) return

      presenceBusyRef.current = true
      lastPresenceWriteRef.current = now

      try {
        const iso = new Date(now).toISOString()
        const updates: Record<string, any> = {
          last_seen_at: iso,
          last_platform: Platform.OS,
          last_app_version: getAppVersion(),
          last_device: getDeviceLabel(),
          updated_at: iso,
        }

        if (profile && !(profile as any)?.first_login_at) {
          updates.first_login_at = iso
        }

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
        if (error) {
          console.warn('[layout] profile presence update failed:', error.message)
        }
      } catch (e) {
        console.warn('[layout] profile presence update failed:', e)
      } finally {
        presenceBusyRef.current = false
      }
    },
    [user?.id, (profile as any)?.first_login_at]
  )

  const handleNotificationNavigation = useCallback(
    (payload: any) => {
      const key = getNotificationKey(payload)

      if (key && lastHandledNotificationRef.current === key) return
      if (key) lastHandledNotificationRef.current = key

      const type = getNotificationType(payload)

      if (
        ['neworder', 'new_order', 'multiorder', 'multi_order'].includes(type) &&
        ['driver', 'merchant', 'admin', 'superadmin'].includes(role)
      ) {
        router.push(getDashboard(role) as any)
        return
      }

      navigateFromNotification(payload)
    },
    [router, role]
  )

  const handleRetryProfile = useCallback(async () => {
    if (repairingProfile) return

    setRepairingProfile(true)
    try {
      await withTimeout(refreshProfile(), ACTION_TIMEOUT_MS, 'Profile refresh')
    } catch (e) {
      console.warn('[layout] manual profile refresh failed:', e)
      Alert.alert(
        'Still loading',
        'We could not load your profile yet. Please check your connection and try again.'
      )
    } finally {
      setRepairingProfile(false)
    }
  }, [repairingProfile, refreshProfile])

  const handleStalledSignOut = useCallback(async () => {
    if (signingOutStalled) return

    setSigningOutStalled(true)
    try {
      await withTimeout(signOut(), ACTION_TIMEOUT_MS, 'Sign out')
    } catch (e) {
      console.warn('[layout] stalled sign out fallback:', e)
    } finally {
      setSigningOutStalled(false)
      router.replace('/(auth)/login' as any)
    }
  }, [signOut, signingOutStalled, router])

  useEffect(() => {
    if (!mustBlockForProfile || !user || profile || loading) {
      setProfileStalled(false)
      return
    }

    const t = setTimeout(() => setProfileStalled(true), PROFILE_STALL_MS)
    return () => clearTimeout(t)
  }, [mustBlockForProfile, user?.id, !!profile, loading])

  useEffect(() => {
    if (!user?.id || !!profile || !profileStalled || isOffline) return

    const iv = setInterval(() => {
      if (!repairingProfile && !signingOutStalled) {
        void refreshProfile().catch(err => {
          console.warn('[layout] background profile retry failed:', err)
        })
      }
    }, AUTO_PROFILE_RETRY_MS)

    return () => clearInterval(iv)
  }, [
    user?.id,
    !!profile,
    profileStalled,
    isOffline,
    repairingProfile,
    signingOutStalled,
    refreshProfile,
  ])

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const offline =
        state.isConnected === false || state.isInternetReachable === false

      setIsOffline(offline)

      if (offline && !wasOffline.current) {
        wasOffline.current = true
        router.replace('/offline' as any)
        return
      }

      if (!offline && wasOffline.current) {
        wasOffline.current = false

        if (!isOfflinePage) return

        if (!user) {
          router.replace('/(customer)/dashboard' as any)
          return
        }

        if (profile) {
          router.replace(getDashboard(role) as any)
        }
      }
    })

    return () => unsub()
  }, [router, isOfflinePage, user?.id, !!profile, role])

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      initNotificationHandler()
    })

    return () => {
      try {
        task.cancel()
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      clearNotificationSubs()
      return
    }

    if (isExpoGo) return

    let mounted = true
    let timer: ReturnType<typeof setTimeout> | null = null

    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(async () => {
        try {
          const Notifications = await import('expo-notifications')
          if (!mounted) return

          const last = await Notifications.getLastNotificationResponseAsync()
          if (last && mounted) {
            handleNotificationNavigation(last)
            if (typeof (Notifications as any).clearLastNotificationResponseAsync === 'function') {
              try {
                await (Notifications as any).clearLastNotificationResponseAsync()
              } catch {}
            }
          }

          const recSub = addReceivedListener((n: any) => {
            if (__DEV__) {
              console.log('[layout] Notification received:', n?.request?.content?.title)
            }
          })
          subsRef.current.set('received', recSub)

          const resSub = addResponseListener((res: any) => {
            handleNotificationNavigation(res)
          })
          subsRef.current.set('response', resSub)
        } catch (e) {
          console.warn('[layout] notification listener setup failed:', e)
        }
      }, DEFERRED_NOTIFICATION_SETUP_MS)
    })

    return () => {
      mounted = false
      if (timer) clearTimeout(timer)
      try {
        task.cancel()
      } catch {}
      clearNotificationSubs()
    }
  }, [user?.id, isExpoGo, handleNotificationNavigation, clearNotificationSubs])

  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        role,
      } as any)
    } else {
      Sentry.setUser(null)
    }
  }, [user?.id, user?.email, role])

  useEffect(() => {
    if (!user?.id || !profile) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        void persistPresence(true)
      }, DEFERRED_PRESENCE_BOOT_MS)
    })

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void persistPresence(false)
      }
    })

    return () => {
      if (timer) clearTimeout(timer)
      try {
        task.cancel()
      } catch {}
      sub.remove()
    }
  }, [user?.id, !!profile, persistPresence])

  useEffect(() => {
    if (loading || isOffline || isLegalPage) return

    if (!user) {
      rejectedAlerted.current = false
      blockedAlerted.current = false

      if (inAuthGroup || isLegalPage || isOfflinePage) return
      if (canBrowseAsGuest(segments)) return

      router.replace('/(auth)/login' as any)
      return
    }

    if (!profile) {
      return
    }

    if (requiresProfileCompletion) {
      if (!isCompleteProfileScreen) {
        router.replace('/(auth)/complete-profile' as any)
      }
      return
    }

    if (!isActiveProfile || accountStatus === 'banned') {
      if (!blockedAlerted.current) {
        blockedAlerted.current = true
        Alert.alert(
          'Account unavailable',
          'Your account is currently unavailable. Please contact support.',
          [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  await signOut()
                } finally {
                  router.replace('/(auth)/login' as any)
                }
              },
            },
          ],
          { cancelable: false }
        )
      }
      return
    }

    blockedAlerted.current = false

    if (['driver', 'merchant', 'admin', 'superadmin'].includes(role)) {
      if (approvalStatus === 'pending') {
        if (segments[1] !== 'pending-approval') {
          router.replace('/(auth)/pending-approval' as any)
        }
        return
      }

      if (approvalStatus === 'rejected') {
        if (!rejectedAlerted.current) {
          rejectedAlerted.current = true
          Alert.alert(
            'Application Not Approved',
            'Your role application was not approved. You can continue using the app as a customer. Contact support if you believe this is a mistake.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    await signOut()
                  } finally {
                    router.replace('/(auth)/login' as any)
                  }
                },
              },
            ],
            { cancelable: false }
          )
        }
        return
      }
    }

    rejectedAlerted.current = false

    if (isCompleteProfileScreen) {
      router.replace(getDashboard(role) as any)
      return
    }

    if (inAuthGroup) {
      router.replace(getDashboard(role) as any)
    }
  }, [
    loading,
    isOffline,
    isLegalPage,
    isOfflinePage,
    inAuthGroup,
    isCompleteProfileScreen,
    user?.id,
    !!profile,
    role,
    approvalStatus,
    profileCompleted,
    isActiveProfile,
    accountStatus,
    fullName,
    username,
    signOut,
    router,
    segmentKey,
  ])

  if (mustBlockForProfile && !!user && !profile && profileStalled) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.backgroundLight,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar
          style={isDark ? 'light' : 'dark'}
          translucent
          backgroundColor="transparent"
        />

        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 20,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.backgroundLight,
              marginBottom: 14,
            }}
          >
            <Ionicons name="refresh-circle" size={30} color={colors.primary} />
          </View>

          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Loading your account…
          </Text>

          <Text
            style={{
              color: colors.textLight,
              fontSize: 14,
              lineHeight: 22,
              textAlign: 'center',
              marginBottom: 18,
            }}
          >
            Your session is ready, but your profile is responding slowly.
            You can retry safely or sign out immediately.
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 10,
              opacity: repairingProfile ? 0.85 : 1,
            }}
            onPress={handleRetryProfile}
            disabled={repairingProfile || signingOutStalled}
          >
            {repairingProfile ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                  Retrying profile…
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                Retry profile load
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              borderRadius: 14,
              paddingVertical: 13,
              alignItems: 'center',
              backgroundColor: colors.backgroundLight,
              opacity: signingOutStalled ? 0.8 : 1,
            }}
            onPress={handleStalledSignOut}
            disabled={repairingProfile || signingOutStalled}
          >
            {signingOutStalled ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '700' }}>
                  Signing out…
                </Text>
              </View>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '700' }}>
                Sign out
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              color: colors.textMuted,
              fontSize: 11,
              lineHeight: 18,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            The app also retries automatically every few seconds while you stay on this screen.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        translucent
        backgroundColor="transparent"
      />

      <SplashGate>
        <Slot />
        {!inAuthGroup && !isLegalPage && !isOfflinePage && <BackToTopFab />}
        <BackgroundLocationDisclosure
          visible={showDisclosure}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      </SplashGate>
    </>
  )
}

// ── RootLayout ────────────────────────────────────────────────────────────────
function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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