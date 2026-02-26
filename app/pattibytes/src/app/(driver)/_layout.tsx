import React from 'react'
import { Stack } from 'expo-router'
import { COLORS } from '../../lib/constants'

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    />
  )
}
