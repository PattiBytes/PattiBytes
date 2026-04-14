// src/components/ui/AppStatusBar.tsx

import React from 'react'
import { Platform , View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


interface Props {
  backgroundColor?: string
  style?: 'light' | 'dark' | 'auto' | 'inverted'
}

export function AppStatusBar({
  backgroundColor = '#F8F9FA',
  style           = 'dark',
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <>
      <StatusBar
        style={style}
        backgroundColor={backgroundColor}
        translucent={false}
      />
      {/*
        Android safety net: if translucent bleeds through despite app.json,
        this fill block covers the status bar area with the correct color.
      */}
      {Platform.OS === 'android' && (
        <View style={{ height: insets.top, backgroundColor }} />
      )}
    </>
  )
}