import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { COLORS } from '../../lib/constants'

type Props = {
  visible: boolean
  title?: string
  message?: string
  onClose: () => void
}

export default function AuthRequiredSheet({
  visible,
  onClose,
  title = 'Sign in required',
  message = 'Please sign in or create an account to continue with this feature.',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <Text style={S.title}>{title}</Text>
          <Text style={S.msg}>{message}</Text>

          <TouchableOpacity
            style={S.primaryBtn}
            onPress={() => {
              onClose()
              router.push('/(auth)/login' as any)
            }}
          >
            <Text style={S.primaryText}>Sign In / Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.secondaryBtn} onPress={onClose}>
            <Text style={S.secondaryText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  msg: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textLight,
    marginBottom: 18,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 14,
  },
})