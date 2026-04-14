import React from 'react'
import { Modal, View, Text, TouchableOpacity, Image, Linking } from 'react-native'
import { COLORS } from '../../lib/constants'
import { S } from './styles'

type Props = {
  visible: boolean
  announcement: any
  onDismiss: () => void
}

export function AnnouncementPopup({ visible, announcement, onDismiss }: Props) {
  if (!announcement) return null
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={S.popupOverlay}>
        <View style={S.popup}>
          {!!announcement.image_url && (
            <Image
              source={{ uri: announcement.image_url }}
              style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
              resizeMode="cover"
            />
          )}
          <Text style={{ fontWeight: '900', fontSize: 18, color: COLORS.text, marginBottom: 6, textAlign: 'center' }}>
            {announcement.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22 }}>
            {announcement.message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {!!announcement.link_url && (
              <TouchableOpacity
                style={[S.popupBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                onPress={() => { Linking.openURL(announcement.link_url); onDismiss() }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>View More</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[S.popupBtn, { backgroundColor: '#F3F4F6', flex: 1 }]}
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