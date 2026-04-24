// components/dashboard/BottomNav.tsx
// Uses @expo/vector-icons (Ionicons) — already installed in this project.
// Active tab detected via usePathname() from expo-router.
// Profile tab shows customer avatar_url if uploaded.
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../lib/constants'

// ─── Nav item definitions ────────────────────────────────────────────────────
type NavItem = {
  id:         string
  label:      string
  route:      string
  icon:       keyof typeof Ionicons.glyphMap        // inactive
  iconActive: keyof typeof Ionicons.glyphMap        // active (filled)
  isCart?:    true
  isProfile?: true
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',    label: 'Home',    route: '/(customer)/dashboard', icon: 'home-outline',     iconActive: 'home'     },
  { id: 'orders',  label: 'Orders',  route: '/(customer)/orders',   icon: 'receipt-outline',  iconActive: 'receipt'  },
  { id: 'cab',     label: 'taxi',     route: '/(customer)/cab',      icon: 'car-outline',      iconActive: 'car'      },  // ← NEW
  { id: 'cart',    label: 'Cart',    route: '/(customer)/cart',     icon: 'cart-outline',     iconActive: 'cart', isCart: true   },
  { id: 'profile', label: 'Profile', route: '/(customer)/profile',  icon: 'person-outline',   iconActive: 'person', isProfile: true },
]

type Props = {
  cartCount:  number
  avatarUrl?: string | null
  firstName?: string
  onNav:      (path: string) => void
}

export function BottomNav({ cartCount, avatarUrl, firstName, onNav }: Props) {
  const insets   = useSafeAreaInsets()
  const pathname = usePathname()

  function isActive(route: string) {
    const bare = route.replace('/(customer)', '')
    return (
      pathname === route      ||
      pathname === bare       ||
      pathname.startsWith(route + '/') ||
      pathname.startsWith(bare  + '/')
    )
  }

  return (
    <View style={[S.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {NAV_ITEMS.map(item => {
        const active   = isActive(item.route)
        const color    = active ? COLORS.primary : '#9CA3AF'
        const showBadge = item.isCart    === true && cartCount > 0
        const isProf    = item.isProfile === true

        return (
          <TouchableOpacity
            key={item.id}
            style={S.tab}
            onPress={() => onNav(item.route)}
            activeOpacity={0.65}
          >
            {/* Active top indicator */}
            {active && <View style={S.topBar} />}

            {/* Icon */}
            <View style={S.iconWrap}>
              {/* Profile tab: real avatar if available */}
              {isProf && avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[S.avatarThumb, active && S.avatarThumbActive]}
                />
              ) : (
                <Ionicons
                  name={active ? item.iconActive : item.icon}
                  size={23}
                  color={color}
                />
              )}

              {/* Cart count badge */}
              {showBadge && (
                <View style={S.badge}>
                  <Text style={S.badgeTxt}>{cartCount > 9 ? '9+' : String(cartCount)}</Text>
                </View>
              )}
            </View>

            <Text style={[S.label, { color }]}>{item.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const S = StyleSheet.create({
  bar: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    flexDirection:   'row',
    backgroundColor: '#ffffff',
    borderTopWidth:  1,
    borderTopColor:  '#F1F2F4',
    paddingTop:      6,
    elevation:       24,
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: -2 },
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 2,
    position:       'relative',
  },
  topBar: {
    position:                'absolute',
    top:                     -6,
    left:                    '20%',
    right:                   '20%',
    height:                  3,
    borderBottomLeftRadius:  3,
    borderBottomRightRadius: 3,
    backgroundColor:         COLORS.primary,
  },
  iconWrap: {
    position: 'relative',
    width:    28,
    height:   26,
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarThumb: {
    width:        26,
    height:       26,
    borderRadius: 13,
    borderWidth:  1.5,
    borderColor:  '#E5E7EB',
  },
  avatarThumbActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  badge: {
    position:          'absolute',
    top:               -5,
    right:             -7,
    backgroundColor:   COLORS.primary,
    borderRadius:      8,
    minWidth:          16,
    height:            16,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
    borderWidth:       1.5,
    borderColor:       '#fff',
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  label:    { fontSize: 10, fontWeight: '600', marginTop: 3 },
})
