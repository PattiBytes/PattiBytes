import React, { useEffect } from 'react';
import { StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height = 16, radius = 8, style }: Props) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true, // reverse — ping-pong shimmer
    );
    return () => cancelAnimation(shimmer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.45, 0.9]),
  }));

  return (
    <Animated.View
      style={[
        S.base,
        { width: width ?? '100%', height, borderRadius: radius },
        animStyle,
        style,
      ]}
    />
  );
}

const S = StyleSheet.create({
  base: { backgroundColor: '#E5E7EB' },
});