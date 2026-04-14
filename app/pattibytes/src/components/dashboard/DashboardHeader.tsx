// components/dashboard/DashboardHeader.tsx
// Uses @expo/vector-icons (Ionicons) — already installed in this project.
// NO paddingTop: layout SafeAreaView handles safe-area insets.
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../lib/constants'
import type { AppSettings } from './types'

type Props = {
  appSettings:     AppSettings | null
  firstName:       string
  avatarUrl?:      string | null
  unreadCount:     number
  cartCount:       number
  locationText:    string
  onNotifications: () => void
  onCart:          () => void
  onLocationPress: () => void
}

export function DashboardHeader({
  appSettings,
  firstName,
  avatarUrl,
  unreadCount,
  cartCount,
  locationText,
  onNotifications,
  onCart,
  onLocationPress,
}: Props) {
  const logoUrl = (appSettings as any)?.app_logo_url ?? null

  return (
    // Zero insets.top — SafeAreaView in dashboard/index.tsx handles this already
    <View style={S.wrap}>

      {/* ── Row 1: Logo · Greeting · Icons ─────────────────────────────── */}
      <View style={S.topRow}>

        {/* App logo */}
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={S.logo} />
        ) : (
          <View style={S.logoPh}>
            <Text style={{ fontSize: 15 }}>🍔</Text>
          </View>
        )}

        {/* Greeting text */}
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={S.hey} numberOfLines={1}>Hey {firstName} 👋</Text>
          <Text style={S.tagline} numberOfLines={1}>What are you craving today?</Text>
        </View>

        {/* Right-side icons */}
        <View style={S.iconRow}>

          {/* Notification bell */}
          <TouchableOpacity style={S.iconBtn} onPress={onNotifications} activeOpacity={0.75}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeTxt}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Cart */}
          <TouchableOpacity style={S.iconBtn} onPress={onCart} activeOpacity={0.75}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
            {cartCount > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeTxt}>{cartCount > 9 ? '9+' : String(cartCount)}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Customer avatar */}
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={S.avatar} />
          ) : (
            <View style={S.avatarPh}>
              <Text style={S.avatarInitial}>
                {firstName?.[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Row 2: Location bar ─────────────────────────────────────────── */}
      <TouchableOpacity style={S.locBar} onPress={onLocationPress} activeOpacity={0.8}>
        <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.9)" />
        <View style={{ flex: 1, marginHorizontal: 7 }}>
          <Text style={S.locLabel}>DELIVER TO</Text>
          <Text style={S.locTxt} numberOfLines={1}>{locationText}</Text>
        </View>
        <Ionicons name="chevron-down" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  wrap: {
    backgroundColor:   COLORS.primary,
    paddingHorizontal: 12,
    // paddingTop is intentionally small — SafeAreaView in the screen handles safe-area
    paddingTop:        6,
    paddingBottom:     8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  8,
  },
  logo: { width: 32, height: 32, borderRadius: 8 },
  logoPh: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  hey:     { color: '#fff', fontSize: 14, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 1 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 5, position: 'relative' },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  badgeTxt:      { color: '#fff', fontSize: 8, fontWeight: '900' },
  avatar:        { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  avatarPh: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.38)',
  },
  avatarInitial: { fontSize: 13, color: '#fff', fontWeight: '800' },
  locBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  locLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 0.6 },
  locTxt:   { color: '#fff', fontWeight: '800', fontSize: 13, marginTop: 1 },
})
