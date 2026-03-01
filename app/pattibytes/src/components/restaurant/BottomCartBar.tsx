import React, { useMemo } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { COLORS } from '../../lib/constants';
import Pressable3D from '../../components/ui/Pressable3D';
export default function BottomCartBar({
  visible,
  itemCount,
  total,
  onGoCart,
  onClear,
}: {
  visible: boolean;
  itemCount: number;
  total: number;
  onGoCart: () => void;
  onClear: () => void;
}) {
  const safeTotal = useMemo(() => (Number.isFinite(total) ? total : 0), [total]);

  if (!visible) return null;

  return (
    <View style={S.wrap} pointerEvents="box-none">
      <View style={S.bar}>
        <View style={{ flex: 1 }}>
          <Text style={S.line1}>
            {itemCount} item{itemCount === 1 ? '' : 's'} selected
          </Text>
          <Text style={S.line2}>₹{safeTotal.toFixed(0)}</Text>
        </View>

        <Pressable3D
          style={S.clearBtn}
          onPress={() => {
            Alert.alert('Clear cart?', 'Remove selected items from cart?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: onClear },
            ]);
          }}
        >
          <Text style={S.clearTxt}>Clear</Text>
        </Pressable3D>

        <Pressable3D style={S.goBtn} onPress={onGoCart}>
          <Text style={S.goTxt}>Go to cart</Text>
        </Pressable3D>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  bar: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 18 : 14,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 18,
  },
  line1: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },
  line2: { color: '#FFF', fontWeight: '900', fontSize: 18, marginTop: 2 },

  clearBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1F2937' },
  clearTxt: { color: '#FCA5A5', fontWeight: '900' },

  goBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary },
  goTxt: { color: '#FFF', fontWeight: '900' },
});
