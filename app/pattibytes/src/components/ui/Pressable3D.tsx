/* eslint-disable @typescript-eslint/no-unused-vars */
// app/pattibytes/src/components/ui/Pressable3D.tsx

// ────────────────────────────────────────────────────────────────────────────
import React, { useCallback } from 'react';
import { Pressable, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  children:          React.ReactNode;
  onPress?:          () => void;
  disabled?:         boolean;
  style?:            StyleProp<ViewStyle>;
  /** Pass a human-readable label for screen readers, e.g. "Add to cart" */
  accessibilityLabel?: string;
  /**
   * Enable hardware texture rasterization.
   * Only enable for large, isolated cards — NOT for list items.
   * Default: false  (fixes memory-pressure bug)
   */
  rasterize?:        boolean;
}

const SPRING_IN  = { damping: 18, stiffness: 400 };
const SPRING_OUT = { damping: 18, stiffness: 400 };

export default function Pressable3D({
  children,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  rasterize = false,   // ✅ FIX 4: opt-in only
}: Props) {
  const p = useSharedValue(0);

  // ✅ FIX 2: shared reset so we can call it from onTouchCancel too
  const resetSpring = useCallback(() => {
    'worklet';
    p.value = withSpring(0, SPRING_OUT);
  }, [p]);

  const aStyle = useAnimatedStyle(() => {
    const t = p.value;
    return {
      transform: [
        { perspective: 900 },
        { translateY: interpolate(t, [0, 1], [0, 2]) },
        { scale:      interpolate(t, [0, 1], [1, 0.97]) },
        { rotateX: `${interpolate(t, [0, 1], [0, 4])}deg` },
        { rotateY: `${interpolate(t, [0, 1], [0, -4])}deg` },
      ],
    };
  });

  // ✅ FIX 2: reset if gesture responder is stolen by a parent ScrollView
  const handleTouchCancel = useCallback((_e: GestureResponderEvent) => {
    p.value = withSpring(0, SPRING_OUT);
  }, [p]);

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      // ✅ FIX 1: guard both handlers — no animation when disabled
      onPressIn={disabled ? undefined : () => {
        p.value = withSpring(1, SPRING_IN);
      }}
      onPressOut={disabled ? undefined : () => {
        p.value = withSpring(0, SPRING_OUT);
      }}
      // ✅ FIX 2: catch gesture-stolen touches
      onTouchCancel={handleTouchCancel}
      style={{ opacity: disabled ? 0.55 : 1 }}
      // ✅ FIX 3: accessibility
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[style, aStyle]}
        // ✅ FIX 4: opt-in rasterization
        renderToHardwareTextureAndroid={rasterize}
        shouldRasterizeIOS={rasterize}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
