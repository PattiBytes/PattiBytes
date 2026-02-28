import React from 'react'
import { Modal, View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

type Props = {
  visible:      boolean
  announcement: any
  onDismiss:    () => void
}

export default function AnnouncementPopup({ visible, announcement, onDismiss }: Props) {
  if (!announcement) return null
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={S.overlay}>
        <View style={S.popup}>
          {!!announcement.imageurl && (
            <Image
              source={{ uri: announcement.imageurl }}
              style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
              resizeMode="cover"
            />
          )}
          <Text style={S.title}>{announcement.title}</Text>
          <Text style={S.msg}>{announcement.message}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {!!announcement.linkurl && (
              <TouchableOpacity
                style={[S.btn, { backgroundColor: COLORS.primary, flex: 1 }]}
                onPress={() => { Linking.openURL(announcement.linkurl); onDismiss() }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>View More</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[S.btn, { backgroundColor: '#F3F4F6', flex: 1 }]}
              onPress={onDismiss}
            >
              <Text style={{ color: '#374151', fontWeight: '700' }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup:   { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', elevation: 20 },
  title:   { fontWeight: '900', fontSize: 18, color: '#111827', marginBottom: 6, textAlign: 'center' },
  msg:     { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22 },
  btn:     { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
})