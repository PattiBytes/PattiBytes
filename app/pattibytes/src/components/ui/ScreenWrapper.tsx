// src/components/ui/ScreenWrapper.tsx

import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppStatusBar } from './AppStatusBar'

interface Props {
  children:          React.ReactNode
  backgroundColor?:  string
  statusBarColor?:   string
  statusBarStyle?:   'light' | 'dark' | 'auto' | 'inverted'
  /**
   * Which edges to inset. Default: ['top','left','right'].
   * Pass ['left','right'] if the screen already has a Stack header
   * handling the top inset.
   */
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}

export function ScreenWrapper({
  children,
  backgroundColor = '#F8F9FA',
  statusBarColor,
  statusBarStyle  = 'dark',
  edges           = ['top', 'left', 'right'],
}: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      <AppStatusBar
        backgroundColor={statusBarColor ?? backgroundColor}
        style={statusBarStyle}
      />
      {children}
    </SafeAreaView>
  )
}