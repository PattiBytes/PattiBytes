import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

type Props = {
  logoUrl:      string | null
  firstName:    string
  unreadCount:  number
  cartCount:    number
  locationText: string
  onNotifications: () => void
  onCart:          () => void
  onLocationPress: () => void
}

export default function DashboardHeader({
  logoUrl, firstName, unreadCount, cartCount,
  locationText, onNotifications, onCart, onLocationPress,
}: Props) {
  return (
    <View style={S.header}>
      {/* Top row: logo, greeting, icons */}
      <View style={S.headerTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          {logoUrl
            ? <Image source={{ uri: logoUrl }} style={S.logo} />
            : <View style={S.logoPh}><Text style={{ fontSize: 20 }}>🍛</Text></View>}
          <Text style={S.greeting} numberOfLines={1}>Hey {firstName} 👋</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={S.iconBtn} onPress={onNotifications}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={S.iconBtn} onPress={onCart}>
            <Text style={{ fontSize: 22 }}>🛒</Text>
            {cartCount > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeTxt}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Location bar */}
      <TouchableOpacity style={S.locationBar} onPress={onLocationPress} activeOpacity={0.85}>
        <Text style={{ fontSize: 16 }}>📍</Text>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 }}>
            DELIVER TO
          </Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
            {locationText}
          </Text>
        </View>
        <View style={S.changeBtn}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Change</Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  header:      { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16 },
  headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo:        { width: 38, height: 38, borderRadius: 10 },
  logoPh:      { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  greeting:    { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 },
  iconBtn:     { padding: 8, position: 'relative' },
  badge:       { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:    { color: '#fff', fontSize: 9, fontWeight: '800' },
  locationBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  changeBtn:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
})