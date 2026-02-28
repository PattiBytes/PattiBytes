import React from 'react'
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

type NavItem = {
  icon:   string
  label:  string
  route:  string
  badge?: number
  active?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { icon: '🏠', label: 'Home',    route: '/customer/dashboard', active: true },
  { icon: '📦', label: 'Orders',  route: '/customer/orders' },
  { icon: '🛒', label: 'Cart',    route: '/customer/cart' },
  { icon: '🎁', label: 'Offers',  route: '/customer/offers' },
  { icon: '👤', label: 'Profile', route: '/customer/profile' },
]

type Props = {
  cartCount: number
  onNav:     (route: string) => void
}

export default function BottomNav({ cartCount, onNav }: Props) {
  const items = NAV_ITEMS.map(n =>
    n.label === 'Cart' ? { ...n, badge: cartCount } : n
  )
  return (
    <View style={S.nav}>
      {items.map(n => (
        <TouchableOpacity key={n.label} style={S.item} onPress={() => onNav(n.route)}>
          <View style={{ position: 'relative' }}>
            <Text style={{ fontSize: 22 }}>{n.icon}</Text>
            {!!n.badge && n.badge > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeTxt}>{n.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[S.label, n.active && { color: COLORS.primary }]}>{n.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const S = StyleSheet.create({
  nav:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 10, elevation: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
  item:     { flex: 1, alignItems: 'center' },
  label:    { fontSize: 10, color: '#9CA3AF', marginTop: 3, fontWeight: '600' },
  badge:    { position: 'absolute', top: -3, right: -6, backgroundColor: COLORS.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
})