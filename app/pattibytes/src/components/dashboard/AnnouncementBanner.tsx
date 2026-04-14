import React from 'react'
import { View, Text, TouchableOpacity, Linking } from 'react-native'
import { S } from './styles'

type Props = {
  announcement: any
  onDismiss: () => void
}

export function AnnouncementBanner({ announcement, onDismiss }: Props) {
  if (!announcement) return null
  return (
    <TouchableOpacity
      style={S.announceBanner}
      onPress={() => announcement.link_url && Linking.openURL(announcement.link_url)}
    >
      <Text style={{ fontSize: 16, marginRight: 8 }}>📢</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>
          {announcement.title}
        </Text>
        <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
          {announcement.message}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
        <Text style={{ color: '#92400E', fontSize: 16, fontWeight: '700' }}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}