import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  visible:     boolean
  itemCount:   number
  merchantName:string
  onCancel:    () => void
  onConfirm:   () => void
}

export default function ClearCartModal({ visible, itemCount, merchantName, onCancel, onConfirm }: Props) {
  if (!visible) return null
  return (
    <View style={S.overlay}>
      <View style={S.modal}>
        <Text style={{ fontSize: 42, marginBottom: 12, textAlign: 'center' }}>🗑️</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' }}>Clear Cart?</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginVertical: 8, lineHeight: 20 }}>
          Remove all {itemCount} item{itemCount !== 1 ? 's' : ''} from {merchantName}?
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity style={[S.btn, { borderWidth: 2, borderColor: '#E5E7EB' }]} onPress={onCancel}>
            <Text style={{ fontWeight: '700', color: '#111827' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btn, { backgroundColor: '#EF4444' }]} onPress={onConfirm}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Clear All</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:   { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '84%', alignItems: 'center', elevation: 20 },
  btn:     { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
})
