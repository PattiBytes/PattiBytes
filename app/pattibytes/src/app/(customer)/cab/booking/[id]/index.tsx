/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, StyleSheet, Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Ionicons } from '@expo/vector-icons'
import { supabase }     from '../../../../../lib/supabase'
import { useAuth }      from '../../../../../contexts/AuthContext'
import { COLORS }       from '../../../../../lib/constants'
import { AppStatusBar } from '../../../../../components/ui/AppStatusBar'

type Booking = {
  id:                   string
  booking_number:       number
  status:               string
  cab_type_slug:        string
  pickup_address:       string
  pickup_landmark:      string | null
  drop_address:         string
  drop_landmark:        string | null
  estimated_distance_km:number | null
  estimated_fare:       number | null
  final_fare:           number | null
  payment_method:       string
  payment_status:       string
  customer_notes:       string | null
  driver_notes:         string | null
  rating:               number | null
  scheduled_at:         string | null
  created_at:           string
  cancelled_at:         string | null
  cancellation_reason:  string | null
  cancelled_by:         string | null
}

const STATUS_STEPS = [
  { key: 'pending',     label: 'Requested',   emoji: '📋' },
  { key: 'accepted',    label: 'Confirmed',   emoji: '✅' },
  { key: 'in_progress', label: 'In Progress', emoji: '🚗' },
  { key: 'completed',   label: 'Completed',   emoji: '🏁' },
]

const STATUS_COLOR: Record<string, string> = {
  pending:     '#F59E0B',
  accepted:    '#3B82F6',
  in_progress: '#8B5CF6',
  completed:   '#10B981',
  cancelled:   '#EF4444',
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CabBookingDetailPage() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
  const { user } = useAuth()

  const [booking,   setBooking]   = useState<Booking | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [cancelling,setCancelling]= useState(false)

  const loadBooking = useCallback(async () => {
    if (!id || !user) return
    try {
      const { data, error } = await supabase
        .from('cab_bookings')
        .select('*')
        .eq('id', id)
        .eq('customer_id', user.id)
        .single()
      if (error) throw error
      setBooking(data as Booking)
    } catch (e: any) {
      Alert.alert('Error', e.message)
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => { loadBooking() }, [loadBooking])

  // Realtime updates
  useEffect(() => {
    if (!id) return
    const ch = supabase
      .channel(`cab-booking-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'cab_bookings', filter: `id=eq.${id}`,
      }, () => loadBooking())
      .subscribe()
    return () => { ch.unsubscribe() }
  }, [id])

  const handleCancel = () => {
    if (!booking || !['pending', 'accepted'].includes(booking.status)) return
    Alert.alert(
      'Cancel Booking?',
      'Are you sure you want to cancel this cab booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel', style: 'destructive',
          onPress: async () => {
            setCancelling(true)
            try {
              const { error } = await supabase
                .from('cab_bookings')
                .update({
                  status:              'cancelled',
                  cancelled_by:        'customer',
                  cancellation_reason: 'Cancelled by customer',
                  cancelled_at:        new Date().toISOString(),
                })
                .eq('id', id)
                .eq('customer_id', user!.id)
              if (error) throw error
              loadBooking()
            } catch (e: any) {
              Alert.alert('Error', e.message)
            } finally {
              setCancelling(false)
            }
          },
        },
      ],
    )
  }

  if (loading || !booking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}>
        <Stack.Screen options={{ title: 'Cab Booking', statusBarStyle: 'light' }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const isCancelled  = booking.status === 'cancelled'
  const isCompleted  = booking.status === 'completed'
  const canCancel    = ['pending', 'accepted'].includes(booking.status)
  const statusCol    = STATUS_COLOR[booking.status] ?? '#9CA3AF'
  const currentStep  = STATUS_STEPS.findIndex(s => s.key === booking.status)

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen
        options={{
          title: `Cab #${booking.booking_number}`,
          headerStyle: { backgroundColor: isCancelled ? '#EF4444' : isCompleted ? '#10B981' : COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
          statusBarStyle: 'light',
        }}
      />
      <AppStatusBar backgroundColor={isCancelled ? '#EF4444' : isCompleted ? '#10B981' : COLORS.primary} style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Status card ───────────────────────────────────────────────── */}
        <View style={[S.statusCard, { borderTopColor: statusCol, borderTopWidth: 4 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={S.bookingNum}>Booking #{booking.booking_number}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(booking.created_at)}</Text>
            </View>
            <View style={[S.bigStatusChip, { backgroundColor: statusCol + '20' }]}>
              <Text style={[S.bigStatusText, { color: statusCol }]}>
                {booking.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Progress steps (not for cancelled) */}
          {!isCancelled && (
            <View style={S.steps}>
              {STATUS_STEPS.map((step, idx) => {
                const done    = idx <= currentStep
                const current = idx === currentStep
                return (
                  <React.Fragment key={step.key}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <View style={[S.stepDot,
                        done    && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                        current && { borderColor: COLORS.primary },
                      ]}>
                        <Text style={{ fontSize: 12 }}>{done ? '✓' : step.emoji}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: done ? COLORS.primary : '#9CA3AF', fontWeight: done ? '700' : '400', marginTop: 4 }}>
                        {step.label}
                      </Text>
                    </View>
                    {idx < STATUS_STEPS.length - 1 && (
                      <View style={[S.stepLine, done && idx < currentStep && { backgroundColor: COLORS.primary }]} />
                    )}
                  </React.Fragment>
                )
              })}
            </View>
          )}

          {isCancelled && booking.cancellation_reason && (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: '#DC2626' }}>
                Reason: {booking.cancellation_reason}
              </Text>
            </View>
          )}
        </View>

        {/* ── Route card ────────────────────────────────────────────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>🗺️ Ride Details</Text>

          <View style={S.routeRow}>
            <View style={[S.routeDot, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={S.routeLabel}>Pickup</Text>
              <Text style={S.routeAddr}>{booking.pickup_address}</Text>
              {booking.pickup_landmark && (
                <Text style={S.routeSub}>Near: {booking.pickup_landmark}</Text>
              )}
            </View>
          </View>

          <View style={S.routeConnector} />

          <View style={S.routeRow}>
            <View style={[S.routeDot, { backgroundColor: '#EF4444' }]} />
            <View style={{ flex: 1 }}>
              <Text style={S.routeLabel}>Drop</Text>
              <Text style={S.routeAddr}>{booking.drop_address}</Text>
              {booking.drop_landmark && (
                <Text style={S.routeSub}>Near: {booking.drop_landmark}</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Fare card ─────────────────────────────────────────────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>💰 Fare Details</Text>
          <FareRow label="Cab Type"      value={booking.cab_type_slug.toUpperCase()} />
          <FareRow label="Payment"       value={booking.payment_method === 'cash' ? '💵 Cash' : '📱 Online'} />
          {booking.estimated_distance_km && (
            <FareRow label="Est. Distance" value={`${booking.estimated_distance_km} km`} />
          )}
          {booking.estimated_fare != null && (
            <FareRow label="Estimated Fare" value={`₹${Number(booking.estimated_fare).toFixed(0)}`} />
          )}
          {booking.final_fare != null && (
            <FareRow label="Final Fare" value={`₹${Number(booking.final_fare).toFixed(0)}`} highlight />
          )}
          <FareRow label="Payment Status" value={booking.payment_status.toUpperCase()} />
        </View>

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        {(booking.customer_notes || booking.driver_notes) && (
          <View style={S.card}>
            <Text style={S.cardTitle}>📝 Notes</Text>
            {booking.customer_notes && (
              <View style={{ marginBottom: 8 }}>
                <Text style={S.routeLabel}>Your note</Text>
                <Text style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{booking.customer_notes}</Text>
              </View>
            )}
            {booking.driver_notes && (
              <View>
                <Text style={S.routeLabel}>Driver note</Text>
                <Text style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{booking.driver_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Contact admin ──────────────────────────────────────────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>📞 Need Help?</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
            Our team will contact you to confirm the booking. You can also reach out directly.
          </Text>
          <TouchableOpacity
            style={S.helpBtn}
            onPress={() => Linking.openURL('https://wa.me/918400009045?text=Hi! Cab booking ' + booking.booking_number)}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 14 }}>WhatsApp Support</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cancel ────────────────────────────────────────────────────── */}
        {canCancel && (
          <TouchableOpacity
            style={S.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color="#EF4444" />
              : <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14 }}>Cancel Booking</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

function FareRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: highlight ? '900' : '600', color: highlight ? COLORS.primary : '#1F2937' }}>
        {value}
      </Text>
    </View>
  )
}

const S = StyleSheet.create({
  statusCard:   {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  bookingNum:   { fontSize: 17, fontWeight: '900', color: '#111827' },
  bigStatusChip:{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  bigStatusText:{ fontSize: 12, fontWeight: '800' },
  steps:        { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingHorizontal: 4 },
  stepDot:      {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB',
    borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  stepLine:     { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  card:         {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  cardTitle:    { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 },
  routeRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot:     { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeLabel:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeAddr:    { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  routeSub:     { fontSize: 11, color: '#6B7280', marginTop: 2 },
  routeConnector: { width: 2, height: 20, backgroundColor: '#E5E7EB', marginLeft: 5, marginVertical: 4 },
  helpBtn:      {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#A7F3D0',
  },
  cancelBtn:    {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
})