import React, { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native'
import { COLORS } from '../../lib/constants'
import { CANCEL_REASONS } from './constants'

interface Props {
  visible:      boolean
  orderNumber:  number
  cancelling:   boolean
  onConfirm:    (reason: string) => void
  onDismiss:    () => void
}

export default function CancelModal({ visible, orderNumber, cancelling, onConfirm, onDismiss }: Props) {
  const [reason, setReason] = useState('')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />
          <Text style={S.title}>Cancel Order #{orderNumber}?</Text>
          <Text style={S.sub}>Select a reason or describe below</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
            {CANCEL_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[S.reasonBtn, reason === r && S.reasonBtnActive]}
                onPress={() => setReason(r)}
                activeOpacity={0.7}
              >
                <Text style={[S.reasonTxt, reason === r && { color: COLORS.primary }]}>
                  {reason === r ? '● ' : '○ '}{r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={S.input}
            placeholder="Or type your own reason..."
            value={reason}
            onChangeText={setReason}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          <View style={S.btnRow}>
            <TouchableOpacity style={S.keepBtn} onPress={() => { setReason(''); onDismiss() }}>
              <Text style={{ fontWeight: '700', color: '#6B7280' }}>Keep Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.cancelBtn, (!reason.trim() || cancelling) && { opacity: 0.5 }]}
              onPress={() => reason.trim() && onConfirm(reason.trim())}
              disabled={!reason.trim() || cancelling}
            >
              {cancelling
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '800' }}>Cancel Order</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  handle:       { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title:        { fontSize: 18, fontWeight: '900', color: '#1F2937', marginBottom: 4, textAlign: 'center' },
  sub:          { color: '#6B7280', textAlign: 'center', fontSize: 13, marginBottom: 16 },
  reasonBtn:    { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8 },
  reasonBtnActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  reasonTxt:    { fontWeight: '600', color: '#4B5563', fontSize: 13 },
  input:        { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#1F2937', marginTop: 8, minHeight: 64 },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 16 },
  keepBtn:      { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelBtn:    { flex: 1.5, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444' },
})
