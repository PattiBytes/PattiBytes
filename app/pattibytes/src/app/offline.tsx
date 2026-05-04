import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  AppState,
  type AppStateStatus,
  Linking,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../lib/constants'

const AUTO_RETRY_SECONDS = 5

function formatTime(ts: number | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getConnectionLabel(state: NetInfoState | null) {
  switch (state?.type) {
    case 'wifi':
      return 'Wi‑Fi'
    case 'cellular':
      return 'Mobile data'
    case 'ethernet':
      return 'Ethernet'
    case 'bluetooth':
      return 'Bluetooth'
    case 'vpn':
      return 'VPN'
    case 'wimax':
      return 'WiMAX'
    case 'other':
      return 'Other network'
    case 'none':
      return 'No network'
    case 'unknown':
    default:
      return 'Unknown'
  }
}

function getOfflineReason(state: NetInfoState | null) {
  if (!state) {
    return 'Checking your current network status.'
  }

  if (state.type === 'none') {
    return 'No network is connected to this device right now.'
  }

  if (state.isConnected === false) {
    return 'Your device appears disconnected from all networks.'
  }

  if (state.isConnected && state.isInternetReachable === false) {
    return 'A network is connected, but internet access is not reachable yet.'
  }

  if (state.type === 'wifi') {
    return 'Your Wi‑Fi may be connected without internet access.'
  }

  if (state.type === 'cellular') {
    return 'Your mobile data may be weak, blocked, or temporarily unavailable.'
  }

  return 'The app is waiting for a stable internet connection.'
}

function getTips(state: NetInfoState | null) {
  const base = [
    'Turn Airplane mode off if it is enabled.',
    'Try switching between Wi‑Fi and mobile data.',
    'Move to a place with better signal or restart your router.',
  ]

  if (state?.type === 'wifi') {
    return [
      'Reconnect to your Wi‑Fi network.',
      'Restart the router if other apps also fail.',
      'If Wi‑Fi is connected but internet is missing, switch to mobile data.',
    ]
  }

  if (state?.type === 'cellular') {
    return [
      'Make sure mobile data is enabled for this SIM.',
      'Check if data balance or daily limit is exhausted.',
      'Try toggling airplane mode for a quick network reset.',
    ]
  }

  return base
}

export default function OfflinePage() {
  const router = useRouter()

  const [netState, setNetState] = useState<NetInfoState | null>(null)
  const [checking, setChecking] = useState(false)
  const [dots, setDots] = useState('')
  const [autoRetryIn, setAutoRetryIn] = useState(AUTO_RETRY_SECONDS)
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null)
  const [manualRetryCount, setManualRetryCount] = useState(0)

  const pulse = useRef(new Animated.Value(1)).current
  const floatY = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0.25)).current
  const appState = useRef<AppStateStatus>(AppState.currentState)

  const isOnline =
    netState?.isConnected === true && netState?.isInternetReachable !== false

  const connectionLabel = useMemo(() => getConnectionLabel(netState), [netState])
  const offlineReason = useMemo(() => getOfflineReason(netState), [netState])
  const tips = useMemo(() => getTips(netState), [netState])

  const networkDetails = (netState?.details ?? {}) as any
  const isExpensive =
    typeof networkDetails?.isConnectionExpensive === 'boolean'
      ? networkDetails.isConnectionExpensive
      : null

  const leaveOffline = useCallback(() => {
    const canGoBack =
      typeof (router as any)?.canGoBack === 'function'
        ? (router as any).canGoBack()
        : false

    if (canGoBack) {
      router.back()
      return
    }

    router.replace('/(customer)/dashboard' as any)
  }, [router])

  const checkConnection = useCallback(
    async (showLoader = true) => {
      if (showLoader) setChecking(true)

      try {
        const state = await NetInfo.fetch()
        setNetState(state)
        setLastCheckedAt(Date.now())

        const onlineNow =
          state.isConnected === true && state.isInternetReachable !== false

        if (onlineNow) {
          leaveOffline()
          return true
        }

        return false
      } catch {
        return false
      } finally {
        if (showLoader) setChecking(false)
      }
    },
    [leaveOffline]
  )

  const handleRetry = useCallback(async () => {
    setManualRetryCount(v => v + 1)
    setAutoRetryIn(AUTO_RETRY_SECONDS)
    await checkConnection(true)
  }, [checkConnection])

  const openDeviceSettings = useCallback(() => {
    Linking.openSettings().catch(() => {})
  }, [])

  useEffect(() => {
    void checkConnection(false)
  }, [checkConnection])

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetState(state)

      const onlineNow =
        state.isConnected === true && state.isInternetReachable !== false

      if (onlineNow) {
        leaveOffline()
      }
    })

    return () => unsubscribe()
  }, [leaveOffline])

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = appState.current
      appState.current = nextState

      if (
        prev.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        void checkConnection(false)
      }
    })

    return () => sub.remove()
  }, [checkConnection])

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.5,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.25,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ])
    )

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    )

    pulseLoop.start()
    floatLoop.start()

    return () => {
      pulseLoop.stop()
      floatLoop.stop()
    }
  }, [pulse, glow, floatY])

  useEffect(() => {
    if (!checking) {
      setDots('')
      return
    }

    const iv = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'))
    }, 350)

    return () => clearInterval(iv)
  }, [checking])

  useEffect(() => {
    if (isOnline) return

    const iv = setInterval(() => {
      setAutoRetryIn(prev => {
        if (prev <= 1) {
          void checkConnection(false)
          return AUTO_RETRY_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(iv)
  }, [isOnline, checkConnection])

  return (
    <SafeAreaView style={S.safe}>
      <View style={S.container}>
        <View style={S.blob1} />
        <View style={S.blob2} />
        <View style={S.gridLine} />

        <ScrollView
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={S.card}>
            <View style={S.topRow}>
              <View style={S.statusPill}>
                <View style={S.statusDot} />
                <Text style={S.statusPillText}>Offline mode</Text>
              </View>

              <View style={S.statusChip}>
                <Text style={S.statusChipText}>{connectionLabel}</Text>
              </View>
            </View>

            <Animated.View
              style={[
                S.iconGlow,
                {
                  opacity: glow,
                  transform: [{ scale: pulse }],
                },
              ]}
            />

            <Animated.View
              style={[
                S.iconBox,
                {
                  transform: [{ scale: pulse }, { translateY: floatY }],
                },
              ]}
            >
              <Ionicons name="cloud-offline-outline" size={58} color={COLORS.primary} />
            </Animated.View>

            <Text style={S.title}>No internet connection</Text>
            <Text style={S.subtitle}>
              {offlineReason}
            </Text>

            <View style={S.metricsRow}>
              <View style={S.metricCard}>
                <Text style={S.metricLabel}>Status</Text>
                <Text style={S.metricValue}>
                  {netState?.isConnected === false ? 'Disconnected' : 'Limited'}
                </Text>
              </View>

              <View style={S.metricCard}>
                <Text style={S.metricLabel}>Reachability</Text>
                <Text style={S.metricValue}>
                  {netState?.isInternetReachable === false
                    ? 'No internet'
                    : netState?.isInternetReachable === true
                    ? 'Reachable'
                    : 'Checking'}
                </Text>
              </View>
            </View>

            <View style={S.infoPanel}>
              <View style={S.infoRow}>
                <Ionicons name="wifi-outline" size={16} color="#6B7280" />
                <Text style={S.infoLabel}>Network type</Text>
                <Text style={S.infoValue}>{connectionLabel}</Text>
              </View>

              <View style={S.infoRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={S.infoLabel}>Last checked</Text>
                <Text style={S.infoValue}>{formatTime(lastCheckedAt)}</Text>
              </View>

              <View style={S.infoRow}>
                <Ionicons name="repeat-outline" size={16} color="#6B7280" />
                <Text style={S.infoLabel}>Auto retry in</Text>
                <Text style={S.infoValue}>{autoRetryIn}s</Text>
              </View>

              <View style={S.infoRow}>
                <Ionicons name="phone-portrait-outline" size={16} color="#6B7280" />
                <Text style={S.infoLabel}>Platform</Text>
                <Text style={S.infoValue}>
                  {Platform.OS === 'ios' ? 'iPhone / iPad' : 'Android'}
                </Text>
              </View>

              {isExpensive !== null && (
                <View style={S.infoRow}>
                  <Ionicons name="cash-outline" size={16} color="#6B7280" />
                  <Text style={S.infoLabel}>Metered</Text>
                  <Text style={S.infoValue}>{isExpensive ? 'Yes' : 'No'}</Text>
                </View>
              )}
            </View>

            <View style={S.noticeBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={S.noticeText}>
                The app will keep checking automatically and return as soon as your
                connection becomes stable again.
              </Text>
            </View>

            <View style={S.tipsBox}>
              <Text style={S.tipsTitle}>Quick fixes</Text>
              {tips.map((tip, i) => (
                <View key={i} style={S.tipRow}>
                  <Text style={S.tipBullet}>•</Text>
                  <Text style={S.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[S.retryBtn, checking && S.retryBtnDisabled]}
              onPress={handleRetry}
              disabled={checking}
              activeOpacity={0.88}
            >
              {checking ? (
                <View style={S.retryInner}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={S.retryTxt}>{`Checking${dots}`}</Text>
                </View>
              ) : (
                <View style={S.retryInner}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={S.retryTxt}>Try again now</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={S.secondaryBtn}
              onPress={openDeviceSettings}
              activeOpacity={0.86}
            >
              <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
              <Text style={S.secondaryBtnTxt}>Open network settings</Text>
            </TouchableOpacity>

            <Text style={S.footerText}>
              Manual retries: {manualRetryCount} • Auto-check runs every {AUTO_RETRY_SECONDS}s
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  blob1: {
    position: 'absolute',
    top: -90,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FFF0E8',
    opacity: 0.9,
  },
  blob2: {
    position: 'absolute',
    bottom: -70,
    left: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFE8DC',
    opacity: 0.75,
  },
  gridLine: {
    position: 'absolute',
    inset: 0,
    opacity: 0.05,
    borderWidth: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    overflow: 'hidden',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F1',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  statusPillText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  statusChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusChipText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  iconGlow: {
    position: 'absolute',
    top: 88,
    alignSelf: 'center',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFE2D2',
  },
  iconBox: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFF4EE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE4D5',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
  },
  infoPanel: {
    backgroundColor: '#FCFCFD',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    marginLeft: 8,
    flex: 1,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8F4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFEBDD',
  },
  noticeText: {
    flex: 1,
    color: '#7C5A46',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  tipsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    width: 16,
    color: COLORS.primary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryBtnDisabled: {
    opacity: 0.8,
  },
  retryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FED7C2',
    marginBottom: 12,
  },
  secondaryBtnTxt: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
})