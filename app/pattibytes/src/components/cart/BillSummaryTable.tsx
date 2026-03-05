import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

interface Row {
  label:    string
  value:    string
  green?:   boolean
  sub?:     string
  isTotal?: boolean
}

function TR({ label, value, green, sub, isTotal }: Row) {
  return (
    <View style={[R.row, isTotal && R.totalRow]}>
      <View style={{ flex: 1 }}>
        <Text style={[R.label, isTotal && R.totalLabel]}>{label}</Text>
        {!!sub && <Text style={R.sub}>{sub}</Text>}
      </View>
      <Text style={[R.value, green && R.green, isTotal && R.totalValue]}>{value}</Text>
    </View>
  )
}

const R = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  totalRow:   { borderBottomWidth: 0, paddingTop: 12, marginTop: 4 },
  label:      { fontSize: 13, color: '#6B7280' },
  totalLabel: { fontSize: 17, fontWeight: '900', color: '#111827' },
  sub:        { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  value:      { fontSize: 13, fontWeight: '600', color: '#111827' },
  green:      { color: '#15803D', fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
})

interface Props {
  subtotal:          number
  itemDiscountTotal: number
  promoDiscount:     number
  promoCode?:        string
  promoIsBxgy?:      boolean
  deliveryFee:       number
  showDeliveryFee:   boolean
  deliveryBreakdown: string
  gstEnabled:        boolean
  gstPct:            number
  taxAmount:         number
  finalTotal:        number
  totalSavings:      number
}

export default function BillSummaryTable(p: Props) {
  const rows: Row[] = [{ label: 'Item Total', value: `₹${p.subtotal.toFixed(2)}` }]

  if (p.itemDiscountTotal > 0)
    rows.push({ label: 'Item Discounts', value: `−₹${p.itemDiscountTotal.toFixed(2)}`, green: true })

  if (p.promoDiscount > 0)
    rows.push({
      label: `Promo${p.promoCode ? ` (${p.promoCode})` : ''}`,
      value: `−₹${p.promoDiscount.toFixed(2)}`,
      green: true,
      sub:   p.promoIsBxgy ? 'Buy & Get Free items offer' : undefined,
    })

  if (p.showDeliveryFee)
    rows.push({ label: 'Delivery Fee', value: `₹${p.deliveryFee.toFixed(2)}`, sub: p.deliveryBreakdown || undefined })

  if (p.gstEnabled && p.gstPct > 0)
    rows.push({ label: `GST (${p.gstPct}%)`, value: `₹${p.taxAmount.toFixed(2)}` })

  return (
    <View style={S.section}>
      <Text style={S.title}>Bill Summary</Text>
      <View style={S.table}>
        {rows.map((r, i) => <TR key={i} {...r} />)}
        <TR label="Total" value={`₹${p.finalTotal.toFixed(2)}`} isTotal />
      </View>
      {p.totalSavings > 0 && (
        <View style={S.savings}>
          <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
            🎉 You save ₹{p.totalSavings.toFixed(2)} on this order!
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:   { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 },
  table:   { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, paddingTop: 4 },
  savings: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 12 },
})
