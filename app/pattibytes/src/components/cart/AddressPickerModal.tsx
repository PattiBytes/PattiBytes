// AddressPickerModal.tsx — full updated file
import React from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, Platform,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import { formatAddr, getAddrEmoji } from './utils'
import type { SavedAddress } from './types'

interface Props {
  visible:    boolean
  addresses:  SavedAddress[]
  selectedId: string | null
  onSelect:   (a: SavedAddress) => void
  onClose:    () => void
  onAddNew:   () => void
}

export default function AddressPickerModal({
  visible, addresses, selectedId, onSelect, onClose, onAddNew,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />

          <View style={S.header}>
            <Text style={S.title}>Select Delivery Address</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={S.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📍</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 }}>
                No saved addresses
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                Add a delivery address to continue
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
            >
              {addresses.map(a => {
                const active = a.id === selectedId
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[S.row, active && S.rowActive]}
                    // ← Immediate optimistic selection before modal closes
                    onPress={() => {
                      onSelect(a)   // updates selectedAddr in parent instantly
                      onClose()     // then closes
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[S.icon, active && { backgroundColor: '#FFF3EE' }]}>
                      <Text style={{ fontSize: 18 }}>{getAddrEmoji(a.label)}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: '#111827', fontSize: 14 }}>
                        {a.label}
                      </Text>
                      {!!a.recipient_name && (
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>
                          {a.recipient_name}
                          {a.recipient_phone ? ` · ${a.recipient_phone}` : ''}
                        </Text>
                      )}
                      <Text
                        style={{ fontSize: 12, color: '#4B5563', marginTop: 2, lineHeight: 18 }}
                        numberOfLines={2}
                      >
                        {formatAddr(a)}
                      </Text>
                      {a.is_default && (
                        <View style={S.defaultBadge}>
                          <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800' }}>
                            DEFAULT
                          </Text>
                        </View>
                      )}
                    </View>

                    {active && (
                      <View style={S.check}>
                        <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={S.addBtn} onPress={onAddNew} activeOpacity={0.8}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>＋</Text>
            <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 14 }}>
              Add New Address
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '900', color: '#111827' },
  emptyState: {
    alignItems: 'center', paddingVertical: 32,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: 'transparent', marginBottom: 8, backgroundColor: '#F9FAFB',
  },
  rowActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  icon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  defaultBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#FFF3EE', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  check: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF3EE', borderRadius: 14, padding: 14,
    marginTop: 12, borderWidth: 1.5, borderColor: COLORS.primary,
  },
})