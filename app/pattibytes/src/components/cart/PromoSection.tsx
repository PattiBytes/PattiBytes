import React from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { PromoCode } from './types'

interface Props {
  promoInput:        string
  appliedPromo:      PromoCode | null
  promoDiscount:     number
  applyingPromo:     boolean
  availablePromos:   PromoCode[]
  showPromoList:     boolean
  subtotal:          number
  onPromoInputChange:(v: string) => void
  onTogglePromoList: () => void
  onApply:           () => void
  onSelectPromo:     (p: PromoCode) => void
  onRemovePromo:     () => void
}

export default function PromoSection({
  promoInput, appliedPromo, promoDiscount, applyingPromo,
  availablePromos, showPromoList, subtotal,
  onPromoInputChange, onTogglePromoList, onApply, onSelectPromo, onRemovePromo,
}: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>🏷️ Promo Code</Text>

      {!appliedPromo ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[S.input, { flex: 1 }]}
              placeholder="Enter promo code"
              placeholderTextColor="#9CA3AF"
              value={promoInput}
              onChangeText={t => onPromoInputChange(t.toUpperCase())}
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
            <>
              <TouchableOpacity onPress={onTogglePromoList}>
                <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>
                  {showPromoList ? '▲ Hide offers' : `▼ View ${availablePromos.length} offer${availablePromos.length !== 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>

              {showPromoList && availablePromos.map(p => {
                const isBxgy  = p.deal_type === 'bxgy'
                const label   = isBxgy
                  ? `Buy ${(p.deal_json as any)?.buy?.qty ?? 1} Get ${(p.deal_json as any)?.get?.qty ?? 1} FREE`
                  : p.discount_type === 'percentage' ? `${p.discount_value}% OFF` : `₹${p.discount_value} OFF`
                const minAmt  = (p as any).min_order_amount ?? 0
                const minOk   = minAmt <= 0 || subtotal >= minAmt

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[S.promoRow, !minOk && { opacity: 0.5 }]}
                    onPress={() => minOk && onSelectPromo(p)}
                    disabled={!minOk}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: COLORS.primary }}>{p.code}</Text>
                      {!!p.description && <Text style={{ fontSize: 12, color: '#4B5563' }}>{p.description}</Text>}
                      {minAmt > 0 && (
                        <Text style={{ fontSize: 11, color: minOk ? '#9CA3AF' : '#EF4444' }}>
                          Min ₹{minAmt}{!minOk ? ` (add ₹${(minAmt - subtotal).toFixed(0)} more)` : ''}
                        </Text>
                      )}
                    </View>
                    <View style={S.badge}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>{label}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </>
          )}
        </>
      ) : (
        <View style={S.appliedRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: '#065F46' }}>
              {appliedPromo.deal_type === 'bxgy'
                ? `🎁 ${appliedPromo.code} — Buy ${(appliedPromo.deal_json as any)?.buy?.qty ?? 1} Get ${(appliedPromo.deal_json as any)?.get?.qty ?? 1} FREE`
                : `🏷️ ${appliedPromo.code}`}
            </Text>
            {promoDiscount > 0 && (
              <Text style={{ fontSize: 12, color: '#047857' }}>Saving ₹{promoDiscount.toFixed(2)}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onRemovePromo}>
            <Text style={{ color: '#EF4444', fontWeight: '700' }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:    { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:      { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  input:      { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827' },
  applyBtn:   { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  promoRow:   { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 8 },
  badge:      { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  appliedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#BBF7D0' },
})
