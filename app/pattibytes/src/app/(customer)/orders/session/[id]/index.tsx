import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase }   from '../../../../../lib/supabase'
import { useAuth }    from '../../../../../contexts/AuthContext'
import { COLORS }     from '../../../../../lib/constants'
import { ScreenLoader } from '../../../../../components/ui/ScreenLoader'

// ── Types ─────────────────────────────────────────────────────────────────────

type MerchantBill = {
  merchant_id:    string
  merchant_name:  string
  subtotal:       number
  delivery_fee:   number
  tax:            number
  discount:       number
  total:          number
  order_id?:      string
  order_number?:  string | number
}

type SessionDetail = {
  id:                  string
  customer_id:         string
  order_ids:           string[] | null    // ← DB returns string[] | null
  merchant_ids:        string[] | null
  total_amount:        number
  delivery_address:    string | null
  delivery_latitude:   number | null
  delivery_longitude:  number | null
  payment_method:      string | null
  payment_status:      string | null
  status:              string
  promo_code:          string | null
  promo_id:            string | null
  discount:            number
  merchant_bills:      MerchantBill[] | null
  created_at:          string
  updated_at:          string
}

type OrderRow = {
  id:           string
  order_number: number | string
  status:       string
  total_amount: number
  merchant_id:  string | null
  order_type:   string | null
  items:        any[] | null
  created_at:   string
  // joined merchant name
  merchant_name?: string | null
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  pending:    '#F59E0B',
  confirmed:  '#3B82F6',
  preparing:  '#8B5CF6',
  ready:      '#06B6D4',
  picked_up:  '#F97316',
  on_the_way: '#F97316',
  delivered:  '#10B981',
  cancelled:  '#EF4444',
  rejected:   '#DC2626',
}

const SESSION_STATUS_LABEL: Record<string, string> = {
  pending:   '⏳ In Progress',
  partial:   '🔄 Partially Delivered',
  completed: '✅ All Delivered',
  cancelled: '❌ Cancelled',
}

function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? '#6B7280'
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
  const { user } = useAuth()

  const [session,    setSession]    = useState<SessionDetail | null>(null)
  const [orders,     setOrders]     = useState<OrderRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id || !user) return
    try {
      // 1. Load session
      const { data: sess, error: sessErr } = await supabase
        .from('multi_cart_sessions')
        .select('*')
        .eq('id', id)
        .eq('customer_id', user.id)
        .single()

      if (sessErr) throw sessErr
      setSession(sess as SessionDetail)

      // 2. Load individual orders  ← FIX: use (sess.order_ids ?? []) to avoid TS 2488
      const safeOrderIds: string[] = sess?.order_ids ?? []

      if (safeOrderIds.length === 0) {
        setOrders([])
        return
      }

      const { data: orderRows, error: ordErr } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,total_amount,merchant_id,order_type,items,created_at',
        )
        .in('id', safeOrderIds)   // ← no more TS error — safeOrderIds is string[]
        .order('session_order_index', { ascending: true })

      if (ordErr) throw ordErr

      // 3. Enrich with merchant names
      const merchantIds = [
        ...new Set(
          (orderRows ?? [])
            .map((o: any) => o.merchant_id)
            .filter(Boolean) as string[],
        ),
      ]

      let merchantNames: Record<string, string> = {}
      if (merchantIds.length > 0) {
        const { data: merchants } = await supabase
          .from('merchants')
          .select('id,business_name')
          .in('id', merchantIds)
        ;(merchants ?? []).forEach((m: any) => {
          merchantNames[m.id] = m.business_name
        })
      }

      const enriched: OrderRow[] = (orderRows ?? []).map((o: any) => ({
        ...o,
        merchant_name: merchantNames[o.merchant_id] ?? null,
      }))

      setOrders(enriched)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not load session', [
        { text: 'Back', onPress: () => router.back() },
      ])
    } finally {
      setLoading(false)
    }
  }, [id, user, router])

  useEffect(() => { load() }, [load])

  // ── Real-time session updates ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const sub = supabase
      .channel(`session-detail-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'multi_cart_sessions', filter: `id=eq.${id}` },
        payload => {
          setSession(prev =>
            prev ? { ...prev, ...(payload.new as Partial<SessionDetail>) } : null,
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders',
          filter: `cart_session_id=eq.${id}` },
        payload => {
          const u = payload.new as Partial<OrderRow>
          if (!u.id) return
          setOrders(prev =>
            prev.map(o => o.id === u.id ? { ...o, ...u } : o),
          )
        },
      )
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [id])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <Stack.Screen options={{ title: 'Multi-Order', statusBarStyle: 'light' }} />
        <ScreenLoader variant="orderDetail" />
      </View>
    )
  }

  if (!session) return null

  // ── Derived ───────────────────────────────────────────────────────────────
  const safeOrderIds:    string[]      = session.order_ids    ?? []  // ← FIX used here too
  const safeMerchantIds: string[]      = session.merchant_ids ?? []  // ← FIX
  const safeBills:       MerchantBill[]= session.merchant_bills ?? []

  const sessionLabel = SESSION_STATUS_LABEL[session.status] ?? session.status
  const allDelivered  = orders.length > 0 && orders.every(o => o.status === 'delivered')
  const anyActive     = orders.some(o =>
    !['delivered', 'cancelled', 'rejected'].includes(o.status),
  )

  const accentColors = [
    COLORS.primary, '#7C3AED', '#DC2626', '#0891B2', '#D97706',
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen
        options={{
          title: `Multi-Order · ${safeOrderIds.length} Restaurants`,
          headerStyle: { backgroundColor: allDelivered ? '#10B981' : COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
          statusBarStyle: 'light',
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Session summary card ──────────────────────────────────── */}
        <View style={S.summaryCard}>
          <View style={S.summaryRow}>
            <Text style={S.summaryLabel}>🛒 Restaurants</Text>
            <Text style={S.summaryValue}>{safeMerchantIds.length}</Text>
          </View>
          <View style={S.summaryRow}>
            <Text style={S.summaryLabel}>📦 Orders</Text>
            <Text style={S.summaryValue}>{safeOrderIds.length}</Text>
          </View>
          <View style={S.summaryRow}>
            <Text style={S.summaryLabel}>💰 Grand Total</Text>
            <Text style={[S.summaryValue, { color: COLORS.primary }]}>
              ₹{Number(session.total_amount).toFixed(2)}
            </Text>
          </View>
          {session.discount > 0 && (
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>🎉 Total Savings</Text>
              <Text style={[S.summaryValue, { color: '#16A34A' }]}>
                -₹{Number(session.discount).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={S.summaryRow}>
            <Text style={S.summaryLabel}>💳 Payment</Text>
            <Text style={S.summaryValue}>
              {session.payment_method?.toUpperCase() ?? '—'} ·{' '}
              {session.payment_status?.toUpperCase() ?? '—'}
            </Text>
          </View>
          {session.promo_code && (
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>🏷️ Promo</Text>
              <Text style={[S.summaryValue, { color: '#7C3AED' }]}>{session.promo_code}</Text>
            </View>
          )}
          <View style={[S.sessionStatusBadge, { backgroundColor: statusColor(session.status) + '20' }]}>
            <Text style={[S.sessionStatusText, { color: statusColor(session.status) }]}>
              {sessionLabel}
            </Text>
          </View>
          <Text style={S.sessionDate}>Placed {fmtDate(session.created_at)}</Text>
        </View>

        {/* ── Delivery address ─────────────────────────────────────── */}
        {session.delivery_address && (
          <View style={S.addressCard}>
            <Text style={S.sectionTitle}>📍 Delivery Address</Text>
            <Text style={S.addressText}>{session.delivery_address}</Text>
            <Text style={S.addressNote}>
              All {safeOrderIds.length} orders deliver to this address
            </Text>
          </View>
        )}

        {/* ── Per-merchant order cards ──────────────────────────────── */}
        <Text style={S.sectionHeader}>
          📦 Individual Orders ({orders.length})
        </Text>

        {orders.map((o, idx) => {
          const bill    = safeBills.find(b => b.order_id === o.id || b.merchant_id === o.merchant_id)
          const accent  = accentColors[idx % accentColors.length]
          const oStatus = o.status

          return (
            <TouchableOpacity
              key={o.id}
              style={[S.orderCard, { borderTopColor: accent }]}
              onPress={() => router.push(`/(customer)/orders/${o.id}` as any)}
              activeOpacity={0.8}
            >
              {/* Header */}
              <View style={S.orderCardHeader}>
                <View style={[S.colorDot, { backgroundColor: accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={S.merchantName}>
                    {o.merchant_name ?? bill?.merchant_name ?? 'Restaurant'}
                  </Text>
                  <Text style={S.orderNum}>Order #{o.order_number}</Text>
                </View>
                <View style={[S.statusPill, { backgroundColor: statusColor(oStatus) + '20' }]}>
                  <Text style={[S.statusText, { color: statusColor(oStatus) }]}>
                    {oStatus.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Items preview */}
              {(o.items ?? []).length > 0 && (
                <Text style={S.itemsPreview} numberOfLines={2}>
                  {(o.items ?? [])
                    .map((i: any) => `${i.name} ×${i.quantity}`)
                    .join(' · ')}
                </Text>
              )}

              {/* Bill summary */}
              {bill && (
                <View style={S.billRow}>
                  <Text style={S.billItem}>Subtotal: ₹{Number(bill.subtotal).toFixed(2)}</Text>
                  {bill.discount > 0 && (
                    <Text style={[S.billItem, { color: '#16A34A' }]}>
                      -₹{Number(bill.discount).toFixed(2)}
                    </Text>
                  )}
                  <Text style={S.billItem}>
                    Delivery: ₹{Number(bill.delivery_fee).toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={S.orderCardFooter}>
                <Text style={S.orderTotal}>
                  ₹{Number(bill?.total ?? o.total_amount).toFixed(2)}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>
                  View Details →
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}

        {/* ── Grand bill breakdown ──────────────────────────────────── */}
        {safeBills.length > 0 && (
          <View style={S.grandBill}>
            <Text style={S.sectionTitle}>🧾 Grand Bill</Text>
            {safeBills.map((b, i) => (
              <View key={b.merchant_id} style={S.grandBillMerchant}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#374151', marginBottom: 4 }}>
                  {b.merchant_name}
                </Text>
                <GrandBillRow label="Subtotal"  value={`₹${Number(b.subtotal).toFixed(2)}`} />
                {b.discount > 0 && (
                  <GrandBillRow label="Discount"
                    value={`-₹${Number(b.discount).toFixed(2)}`} green />
                )}
                <GrandBillRow label="Delivery"  value={`₹${Number(b.delivery_fee).toFixed(2)}`} />
                {b.tax > 0 && (
                  <GrandBillRow label="Tax/GST"  value={`₹${Number(b.tax).toFixed(2)}`} />
                )}
                <GrandBillRow label="Total"     value={`₹${Number(b.total).toFixed(2)}`} bold />
                {i < safeBills.length - 1 && <View style={S.divider} />}
              </View>
            ))}

            <View style={S.grandTotal}>
              <Text style={S.grandTotalLabel}>Grand Total</Text>
              <Text style={S.grandTotalValue}>
                ₹{Number(session.total_amount).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {anyActive && (
          <View style={S.liveNote}>
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600' }}>
              Live updates active — orders update automatically
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ── GrandBillRow ──────────────────────────────────────────────────────────────
function GrandBillRow({
  label, value, green, bold,
}: { label: string; value: string; green?: boolean; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</Text>
      <Text style={{
        fontSize:   bold ? 13 : 12,
        fontWeight: bold ? '800' : '600',
        color:      green ? '#16A34A' : bold ? '#111827' : '#374151',
      }}>
        {value}
      </Text>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  sessionStatusBadge: { marginTop: 12, borderRadius: 8,
                        paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  sessionStatusText:  { fontSize: 13, fontWeight: '800' },
  sessionDate:        { fontSize: 11, color: '#9CA3AF', marginTop: 8 },

  addressCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  addressText:  { fontSize: 13, color: '#374151', lineHeight: 20 },
  addressNote:  { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  sectionHeader: {
    fontSize: 15, fontWeight: '800', color: '#1F2937',
    marginHorizontal: 16, marginTop: 8, marginBottom: 6,
  },

  orderCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 16, borderTopWidth: 3, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  orderCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  colorDot:       { width: 12, height: 12, borderRadius: 6 },
  merchantName:   { fontSize: 14, fontWeight: '800', color: '#111827' },
  orderNum:       { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  statusPill:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:     { fontSize: 10, fontWeight: '800' },
  itemsPreview:   { fontSize: 12, color: '#6B7280', paddingHorizontal: 14,
                    paddingTop: 10, lineHeight: 18 },
  billRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10,
                    paddingHorizontal: 14, paddingTop: 8 },
  billItem:       { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  orderCardFooter:{ flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', padding: 14, paddingTop: 10 },
  orderTotal:     { fontSize: 15, fontWeight: '900', color: '#111827' },

  grandBill: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  grandBillMerchant: { paddingVertical: 8 },
  divider:           { height: 1, backgroundColor: '#F3F4F6', marginVertical: 6 },
  grandTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1.5, borderTopColor: '#E5E7EB',
    marginTop: 10, paddingTop: 12,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: '900', color: '#111827' },
  grandTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },

  liveNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10,
  },
})