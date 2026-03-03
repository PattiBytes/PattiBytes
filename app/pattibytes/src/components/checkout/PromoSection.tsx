import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { PromoCode } from '../../services/promoCodes'

interface Props {
  promoInput:       string
  appliedPromo:     PromoCode | null
  promoDiscount:    number
  applyingPromo:    boolean
  availablePromos:  PromoCode[]
  showPromoList:    boolean
  onPromoChange:    (v: string) => void
  onToggleList:     () => void
  onApply:          () => void
  onSelectPromo:    (p: PromoCode) => void
  onRemove:         () => void
  subtotal:         number
}

export default function PromoSection({
  promoInput, appliedPromo, promoDiscount, applyingPromo,
  availablePromos, showPromoList, onPromoChange,
  onToggleList, onApply, onSelectPromo, onRemove, subtotal,
}: Props) {
  if (appliedPromo) {
    return (
      <View style={S.section}>
        <Text style={S.title}>🏷️ Promo Code</Text>
        <View style={S.appliedRow}>
          <View style={{ flex: 1 }}>
            <Text style={S.appliedCode}>
              {appliedPromo.deal_type === 'bxgy'
                ? `${appliedPromo.code} · Buy ${(appliedPromo.deal_json as any)?.buy?.qty ?? 1} Get ${(appliedPromo.deal_json as any)?.get?.qty ?? 1} FREE`
                : appliedPromo.discount_type === 'free_delivery'
                ? `${appliedPromo.code} · 🚚 Free Delivery`
                : appliedPromo.code}
            </Text>
            {promoDiscount > 0 && (
              <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                Saving ₹{promoDiscount.toFixed(2)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onRemove}
            style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEF2F2', borderRadius: 8 }}
          >
            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={S.section}>
      <Text style={S.title}>🏷️ Promo Code</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput
          style={[S.input, { flex: 1 }]}
          placeholder="Enter promo code"
          value={promoInput}
          onChangeText={v => onPromoChange(v.toUpperCase())}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[S.applyBtn, (!promoInput.trim() || applyingPromo) && { opacity: 0.45 }]}
          onPress={onApply}
          disabled={!promoInput.trim() || applyingPromo}
        >
          {applyingPromo
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700' }}>Apply</Text>}
        </TouchableOpacity>
      </View>

      {availablePromos.length > 0 && (
        <TouchableOpacity onPress={onToggleList}>
          <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>
            {showPromoList
              ? '▲ Hide offers'
              : `▼ ${availablePromos.length} offer${availablePromos.length !== 1 ? 's' : ''} available`}
          </Text>
        </TouchableOpacity>
      )}

      {showPromoList && (
        <View style={{ marginTop: 8, gap: 8 }}>
          {availablePromos.map(p => {
            const label = p.deal_type === 'bxgy'
              ? `Buy ${(p.deal_json as any)?.buy?.qty ?? 1} Get ${(p.deal_json as any)?.get?.qty ?? 1} FREE`
              : p.discount_type === 'free_delivery'
              ? '🚚 Free Delivery'
              : p.discount_type === 'percentage'
              ? `${p.discount_value}% OFF`
              : `₹${p.discount_value} OFF`
            const minOk = !p.min_order_amount || subtotal >= p.min_order_amount

            return (
              <TouchableOpacity
                key={p.id}
                style={[S.promoItem, !minOk && { opacity: 0.5 }]}
                onPress={() => minOk && onSelectPromo(p)}
                disabled={!minOk}
              >
                <View style={{ flex: 1 }}>
                  <Text style={S.promoCode}>{p.code}</Text>
                  {!!p.description && (
                    <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 1 }}>{p.description}</Text>
                  )}
                  {(p.min_order_amount ?? 0) > 0 && (
                    <Text style={{ fontSize: 11, color: minOk ? '#9CA3AF' : '#EF4444', marginTop: 1 }}>
                      {minOk ? `Min ₹${p.min_order_amount}` : `Need ₹${((p.min_order_amount ?? 0) - subtotal).toFixed(0)} more`}
                    </Text>
                  )}
                </View>
                <View style={S.promoBadge}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>{label}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:     { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:       { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  input:       { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA' },
  applyBtn:    { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  appliedRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#BBF7D0' },
  appliedCode: { fontWeight: '800', color: '#065F46', fontSize: 13 },
  promoItem:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12 },
  promoCode:   { fontWeight: '800', color: COLORS.primary, fontSize: 13 },
  promoBadge:  { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
})
