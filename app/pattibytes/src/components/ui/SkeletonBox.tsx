// src/components/ui/SkeletonBox.tsx
import React, { useEffect, useRef } from 'react'
import { Animated, StyleProp, ViewStyle } from 'react-native'

interface SkeletonBoxProps {
  width?:        number | `${number}%` | 'auto'
  height:        number
  borderRadius?: number
  style?:        StyleProp<ViewStyle>
}

export function SkeletonBox({
  width = '100%',
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue:         1,
          duration:        750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         0.45,
          duration:        750,
          useNativeDriver: true,
        }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width:           width as any,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  )
}