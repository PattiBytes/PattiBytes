import React, { useEffect, useMemo, useRef, useState } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { APP_NAME, COLORS } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'

type SplashGateProps = {
  children: React.ReactNode
  minVisibleMs?: number
  profileWaitMs?: number
}

const DEFAULT_MIN_VISIBLE_MS = 900
const DEFAULT_PROFILE_WAIT_MS = 3500

export default function SplashGate({
  children,
  minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
  profileWaitMs = DEFAULT_PROFILE_WAIT_MS,
}: SplashGateProps) {
  const { user, profile, loading } = useAuth()

  const [minElapsed, setMinElapsed] = useState(false)
  const [profileTimedOut, setProfileTimedOut] = useState(false)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (mountedRef.current) setMinElapsed(true)
    }, minVisibleMs)

    return () => clearTimeout(t)
  }, [minVisibleMs])

  useEffect(() => {
    setProfileTimedOut(false)

    if (loading) return
    if (!user) return
    if (profile) return

    const t = setTimeout(() => {
      if (mountedRef.current) setProfileTimedOut(true)
    }, profileWaitMs)

    return () => clearTimeout(t)
  }, [loading, user, profile, profileWaitMs])

  const shouldShowSplash = useMemo(() => {
    if (!minElapsed) return true
    if (loading) return true
    if (user && !profile && !profileTimedOut) return true
    return false
  }, [minElapsed, loading, user, profile, profileTimedOut])

  if (shouldShowSplash) {
    return (
      <View style={S.container}>
        <View style={S.card}>
          <View style={S.logoWrap}>
            <Text style={S.logoEmoji}>🍽️</Text>
          </View>

          <Text style={S.title}>{APP_NAME}</Text>
          <Text style={S.subtitle}>
            {loading
              ? 'Restoring your session...'
              : user && !profile && !profileTimedOut
              ? 'Loading your profile...'
              : 'Getting things ready...'}
          </Text>

          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={S.loader}
          />
        </View>
      </View>
    )
  }

  return <>{children}</>
}

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  logoEmoji: {
    fontSize: 42,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  loader: {
    marginTop: 24,
  },
})