import React from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'

type Props = {
  announcement: any
  onDismiss:    () => void
}

export default function AnnouncementBanner({ announcement, onDismiss }: Props) {
  if (!announcement) return null
  return (
    <TouchableOpacity
      style={S.banner}
      onPress={() => announcement.linkurl && Linking.openURL(announcement.linkurl)}
      activeOpacity={0.9}
    >
      <Text style={{ fontSize: 16, marginRight: 8 }}>📢</Text>
      <View style={{ flex: 1 }}>
        <Text style={S.title}>{announcement.title}</Text>
        <Text style={S.msg} numberOfLines={2}>{announcement.message}</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
        <Text style={{ color: '#92400E', fontSize: 16, fontWeight: '700' }}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const S = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, margin: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FCD34D' },
  title:  { fontWeight: '800', color: '#92400E', fontSize: 13 },
  msg:    { color: '#92400E', fontSize: 12, marginTop: 2 },
})