import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

export default function Pressable3D({
  children,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => {
    const t = p.value; // 0..1
    const scale = interpolate(t, [0, 1], [1, 0.97]);
    const rotateX = interpolate(t, [0, 1], [0, 6]);
    const rotateY = interpolate(t, [0, 1], [0, -6]);
    const ty = interpolate(t, [0, 1], [0, 3]);

    return {
      transform: [
        { perspective: 900 },
        { translateY: ty },
        { scale },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => (p.value = withSpring(1, { damping: 14, stiffness: 220 }))}
      onPressOut={() => (p.value = withSpring(0, { damping: 14, stiffness: 220 }))}
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      <Animated.View
  style={[style, aStyle]}
  renderToHardwareTextureAndroid={true}
  shouldRasterizeIOS={true}
>
        {children}
      </Animated.View>
    </Pressable>
  );
}
