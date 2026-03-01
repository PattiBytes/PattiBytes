// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

import Pressable3D from './Pressable3D';
import { COLORS } from '../../lib/constants';

type ScrollRegistrar = {
  setHandler: (h: { scrollToTop: () => void } | null) => void;
  setScrollY: (y: number) => void;
  scrollY: number;
  handler: { scrollToTop: () => void } | null;
};

const Ctx = createContext<ScrollRegistrar | null>(null);

export function ScrollToTopProvider({ children }: { children: React.ReactNode }) {
  const [handler, setHandler] = useState<{ scrollToTop: () => void } | null>(null);
  const [scrollY, setScrollY] = useState(0);

  const value = useMemo(
    () => ({ handler, setHandler, scrollY, setScrollY }),
    [handler, scrollY]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScrollToTopRegistry() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useScrollToTopRegistry must be used inside ScrollToTopProvider');
  return v;
}

/**
 * Register a ScrollView as the ACTIVE scroll container for the current screen.
 * Put this in the SCREEN that actually scrolls (usually the top-level ScrollView/FlatList).
 */
export function useRegisterScrollViewToTop(ref: React.RefObject<ScrollView>, opts?: { threshold?: number }) {
  const { setHandler, setScrollY } = useScrollToTopRegistry();
  const threshold = opts?.threshold ?? 420;

  useFocusEffect(
    useCallback(() => {
      setHandler({
        scrollToTop: () => {
          ref.current?.scrollTo({ y: 0, animated: true });
        },
      });
      return () => setHandler(null);
    }, [ref, setHandler])
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset?.y ?? 0;
      setScrollY(y > threshold ? y : y); // keep scrollY updated; visibility handled in FAB
    },
    [setScrollY, threshold]
  );

  return { onScroll };
}

export function BackToTopFab() {
  const insets = useSafeAreaInsets();
  const { handler, scrollY } = useScrollToTopRegistry();

  const visible = !!handler && scrollY > 420;

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={[S.fabWrap, { bottom: 16 + insets.bottom }]}>
      <Pressable3D
        style={S.fab}
        onPress={() => handler?.scrollToTop()}
      >
        <Text style={S.fabTxt}>↑ Top</Text>
      </Pressable3D>
    </View>
  );
}

const S = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 14,
  },
  fab: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fabTxt: { color: '#FFF', fontWeight: '900' },
});
