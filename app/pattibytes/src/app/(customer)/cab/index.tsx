 
import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Linking, ActivityIndicator, StyleSheet, Animated,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase }     from '../../../lib/supabase'
import { COLORS }       from '../../../lib/constants'
import { AppStatusBar } from '../../../components/ui/AppStatusBar'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppSettings = {
  support_phone: string | null
  support_email: string | null
  app_name:      string | null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CabBookingPage() {
  const [settings,  setSettings]  = useState<AppSettings | null>(null)
  const [loading,   setLoading]   = useState(true)

  // Pulse animation for the call button
  const pulseAnim = React.useRef(new Animated.Value(1)).current

  // ── Load support phone from app_settings ──────────────────────────────────
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('support_phone,support_email,app_name')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data as AppSettings)
        setLoading(false)
      })
  }, [])

  // ── Pulse animation loop ──────────────────────────────────────────────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06, duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 700,
          useNativeDriver: true,
        }),
      ]),
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCall = () => {
    const phone = settings?.support_phone
    if (!phone) return
    Linking.openURL(`tel:${phone}`)
  }

  const handleWhatsApp = () => {
    const phone = settings?.support_phone?.replace(/[^0-9]/g, '')
    if (!phone) return
    Linking.openURL(`https://wa.me/91${phone}?text=Hi!%20I%20want%20to%20book%20a%20cab.`)
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
        <Stack.Screen options={{
          title: 'Book a Cab',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          statusBarStyle: 'light',
        }} />
        <AppStatusBar backgroundColor={COLORS.primary} style="light" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const phone = settings?.support_phone ?? null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen
        options={{
          title: '🚕 Book a Cab',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
          statusBarStyle: 'light',
        }}
      />
      <AppStatusBar backgroundColor={COLORS.primary} style="light" />

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero illustration card ──────────────────────────────────── */}
        <View style={S.heroCard}>
          <Text style={S.heroEmoji}>🚕</Text>
          <Text style={S.heroTitle}>Book Your Ride</Text>
          <Text style={S.heroSub}>
            Call us and we&apos;ll arrange your cab instantly.{'\n'}
            Available 7 days a week.
          </Text>
        </View>

        {/* ── How it works ────────────────────────────────────────────── */}
        <Text style={S.sectionLabel}>How it works</Text>
        <View style={S.stepsCard}>
          {STEPS.map((step, i) => (
            <View key={step.label} style={[S.stepRow, i < STEPS.length - 1 && S.stepBorder]}>
              <View style={[S.stepDot, { backgroundColor: step.bg }]}>
                <Text style={S.stepEmoji}>{step.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.stepLabel}>{step.label}</Text>
                <Text style={S.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Main call button ─────────────────────────────────────────── */}
        {phone ? (
          <>
            <Text style={S.sectionLabel}>Call to book</Text>

            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginHorizontal: 16 }}>
              <TouchableOpacity
                style={S.callBtn}
                onPress={handleCall}
                activeOpacity={0.88}
              >
                <View style={S.callIconWrap}>
                  <Ionicons name="call" size={28} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.callLabel}>Tap to Call Us Now</Text>
                  <Text style={S.callNumber}>{phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </Animated.View>

            {/* ── WhatsApp option ───────────────────────────────────── */}
            <TouchableOpacity
              style={S.waBtn}
              onPress={handleWhatsApp}
              activeOpacity={0.85}
            >
              <Text style={S.waEmoji}>💬</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.waLabel}>Message on WhatsApp</Text>
                <Text style={S.waSub}>Prefer to chat? We&apos;re here.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#15803D" />
            </TouchableOpacity>
          </>
        ) : (
          /* Fallback if no phone configured */
          <View style={S.noPhoneCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔧</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
              Contact details not configured yet.{'\n'}Please check back soon.
            </Text>
          </View>
        )}

        {/* ── Info note ───────────────────────────────────────────────── */}
        <View style={S.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={S.infoNoteText}>
            Our team will confirm your pickup, destination, and fare over the call.
            In-app cab booking is coming soon!
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Static step data ─────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: '📞',
    label: 'Call or WhatsApp us',
    desc:  'Reach our team on the number below.',
    bg:    '#FFF7ED',
  },
  {
    emoji: '📍',
    label: 'Share your location',
    desc:  'Tell us your pickup & drop address.',
    bg:    '#EFF6FF',
  },
  {
    emoji: '🚕',
    label: 'We dispatch your ride',
    desc:  'A driver is assigned and contacts you.',
    bg:    '#F0FDF4',
  },
  {
    emoji: '✅',
    label: 'Reach your destination',
    desc:  'Pay by cash or online — your choice.',
    bg:    '#F5F3FF',
  },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  scroll: {
    paddingBottom: 60,
  },

  // Hero
  heroCard: {
    alignItems: 'center', backgroundColor: COLORS.primary,
    paddingTop: 36, paddingBottom: 32, paddingHorizontal: 24,
    marginBottom: 8,
  },
  heroEmoji: { fontSize: 56, marginBottom: 10 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 21,
  },

  // Section label
  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: '#9CA3AF',
    letterSpacing: 1, textTransform: 'uppercase',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },

  // Steps
  stepsCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  stepBorder: {
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  stepDot: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  stepEmoji:  { fontSize: 22 },
  stepLabel:  { fontSize: 14, fontWeight: '800', color: '#111827' },
  stepDesc:   { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Call button
  callBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: 18,
    padding: 18, gap: 14,
    elevation: 4, shadowColor: COLORS.primary,
    shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  callIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  callLabel:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  callNumber: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  // WhatsApp button
  waBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 16,
    padding: 16, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1.5, borderColor: '#BBF7D0', gap: 12,
  },
  waEmoji: { fontSize: 28 },
  waLabel: { fontSize: 14, fontWeight: '800', color: '#15803D' },
  waSub:   { fontSize: 12, color: '#166534', marginTop: 1 },

  // No phone fallback
  noPhoneCard: {
    alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, borderRadius: 16, padding: 32,
    borderWidth: 1, borderColor: '#E5E7EB',
  },

  // Info note
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
  },
  infoNoteText: {
    flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18,
  },
})