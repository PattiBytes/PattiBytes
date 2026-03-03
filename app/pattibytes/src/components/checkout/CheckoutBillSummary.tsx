import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

interface Props {
  subtotal:          number
  itemDiscountTotal: number
  promoDiscount:     number
  promoCode?:        string | null
  promoIsBxgy?:      boolean
  bxgyGiftCount?:    number
  deliveryFee:       number
  showDeliveryFee:   boolean
  isFreeDelivery:    boolean
  deliveryBreakdown: string
  gstEnabled:        boolean
  gstPct:            number
  taxAmount:         number
  finalTotal:        number
  totalSavings:      number
}

function BillRow({ label, value, green, sub }: {
  label: string; value: string; green?: boolean; sub?: string
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
        <Text style={{ fontWeight: '700', color: green ? '#15803D' : '#111827', fontSize: 14 }}>
          {value}
        </Text>
      </View>
      {!!sub && <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{sub}</Text>}
    </View>
  )
}

export default function CheckoutBillSummary({
  subtotal, itemDiscountTotal, promoDiscount, promoCode,
  promoIsBxgy, bxgyGiftCount = 0, deliveryFee, showDeliveryFee,
  isFreeDelivery, deliveryBreakdown, gstEnabled, gstPct,
  taxAmount, finalTotal, totalSavings,
}: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>🧾 Bill Summary</Text>

      <BillRow label="Item Total" value={`₹${subtotal.toFixed(2)}`} />

      {itemDiscountTotal > 0 && (
        <BillRow
          label="Item Discounts"
          value={`-₹${itemDiscountTotal.toFixed(2)}`}
          green
        />
      )}

      {promoDiscount > 0 && (
        <BillRow
          label={`Promo${promoCode ? ` (${promoCode})` : ''}`}
          value={`-₹${promoDiscount.toFixed(2)}`}
          green
          sub={promoIsBxgy && bxgyGiftCount > 0
            ? `${bxgyGiftCount} free item${bxgyGiftCount !== 1 ? 's' : ''} deducted`
            : undefined}
        />
      )}

      {showDeliveryFee && (
        <BillRow
          label="Delivery Fee"
          value={isFreeDelivery ? '🎉 FREE' : `₹${deliveryFee.toFixed(2)}`}
          green={isFreeDelivery}
          sub={deliveryBreakdown || undefined}
        />
      )}

      {gstEnabled && gstPct > 0 && (
        <BillRow
          label={`GST (${gstPct}%)`}
          value={`₹${taxAmount.toFixed(2)}`}
        />
      )}

      {/* Total row */}
      <View style={S.totalRow}>
        <Text style={S.totalLbl}>Total</Text>
        <Text style={S.totalVal}>₹{finalTotal.toFixed(2)}</Text>
      </View>

      {totalSavings > 0 && (
        <View style={S.savingsBox}>
          <Text style={S.savingsTxt}>
            🎉 You saved ₹{totalSavings.toFixed(2)} on this order!
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:    { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:      { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F3F4F6', marginTop: 6 },
  totalLbl:   { fontSize: 18, fontWeight: '900', color: '#111827' },
  totalVal:   { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  savingsBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 12 },
  savingsTxt: { color: '#15803D', fontWeight: '700', fontSize: 13, textAlign: 'center' },
})
