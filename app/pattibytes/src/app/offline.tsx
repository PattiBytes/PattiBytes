import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ActivityIndicator, Animated, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import NetInfo from '@react-native-community/netinfo'
import { COLORS } from '../lib/constants'

export default function OfflinePage() {
  const router  = useRouter()
  const [checking, setChecking] = useState(false)
  const [dots, setDots]         = useState('')
  const pulse = useRef(new Animated.Value(1)).current

  // Animated pulse for the wifi icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [pulse])

  // Dot animation while checking
  useEffect(() => {
    if (!checking) { setDots(''); return }
    const iv = setInterval(() =>
      setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(iv)
  }, [checking])

  // Auto-retry every 4 seconds silently
  useEffect(() => {
    const iv = setInterval(async () => {
      const state = await NetInfo.fetch()
      if (state.isConnected) router.back()
    }, 4000)
    return () => clearInterval(iv)
  }, [router])

  const handleRetry = async () => {
    setChecking(true)
    try {
      const state = await NetInfo.fetch()
      if (state.isConnected) {
        router.back()
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <View style={S.container}>
      {/* Background blobs */}
      <View style={S.blob1} />
      <View style={S.blob2} />

      <View style={S.card}>
        {/* Icon */}
        <Animated.View style={[S.iconBox, { transform: [{ scale: pulse }] }]}>
          <Text style={{ fontSize: 64 }}>📡</Text>
        </Animated.View>

        {/* Title */}
        <Text style={S.title}>No Internet</Text>
        <Text style={S.subtitle}>
          You&apos;re offline. Check your Wi-Fi or mobile data and try again.
        </Text>

        {/* Tips */}
        <View style={S.tipsBox}>
          {[
            '📶  Enable Wi-Fi or mobile data',
            '✈️  Turn off Airplane mode',
            '🔄  Restart your connection',
          ].map((tip, i) => (
            <Text key={i} style={S.tip}>{tip}</Text>
          ))}
        </View>

        {/* Retry button */}
        <TouchableOpacity
          style={[S.retryBtn, checking && { opacity: 0.7 }]}
          onPress={handleRetry}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={S.retryTxt}>{`Checking${dots}`}</Text>
            </View>
          ) : (
            <Text style={S.retryTxt}>🔄  Try Again</Text>
          )}
        </TouchableOpacity>

        <Text style={S.autoTxt}>Checking automatically every 4 seconds</Text>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  blob1: {
    position: 'absolute', top: -80, right: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#FFF3EE', opacity: 0.8,
  },
  blob2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#FFF3EE', opacity: 0.6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iconBox: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26, fontWeight: '900',
    color: '#111827', marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, color: '#6B7280',
    textAlign: 'center', lineHeight: 22,
    marginBottom: 24,
  },
  tipsBox: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 16, width: '100%', gap: 10, marginBottom: 28,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  tip: {
    fontSize: 13, color: '#4B5563', lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 40, width: '100%',
    alignItems: 'center', marginBottom: 14,
  },
  retryTxt: {
    color: '#fff', fontWeight: '800', fontSize: 16,
  },
  autoTxt: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'center',
  },
})
