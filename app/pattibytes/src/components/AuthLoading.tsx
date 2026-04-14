import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { APP_NAME, DEVELOPER, COLORS } from '../lib/constants';
import { Skeleton } from './ui/Skeleton';

export function AuthLoading() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header skeleton — matches DashboardHeader */}
      <View style={[S.headerBg, { paddingTop: 8 }]}>
        <View style={S.headerTopRow}>
          {/* Logo + greeting */}
          <Skeleton width={30} height={30} radius={8} style={S.mr8} />
          <View style={{ flex: 1, gap: 5 }}>
            <Skeleton width="50%" height={13} radius={6} style={S.lightSkeleton} />
            <Skeleton width="70%" height={10} radius={5} style={S.lightSkeleton} />
          </View>
          {/* Icons */}
          <Skeleton width={28} height={28} radius={14} style={[S.lightSkeleton, S.mr8]} />
          <Skeleton width={28} height={28} radius={14} style={S.lightSkeleton} />
        </View>
        {/* Location bar */}
        <Skeleton height={42} radius={10} style={[S.lightSkeleton, { marginTop: 10 }]} />
      </View>

      {/* Body */}
      <View style={S.body}>
        {/* Search bar */}
        <Skeleton height={44} radius={12} style={S.mb12} />

        {/* Quick action pills */}
        <View style={S.row}>
          {[80, 70, 90, 65].map((w, i) => (
            <Skeleton key={i} width={w} height={34} radius={20} style={S.mr8} />
          ))}
        </View>

        {/* Section label */}
        <Skeleton width={120} height={14} radius={6} style={[S.mb8, { marginTop: 18 }]} />

        {/* Category chips */}
        <View style={S.row}>
          {[60, 70, 55, 65, 58].map((w, i) => (
            <Skeleton key={i} width={w} height={60} radius={12} style={S.mr8} />
          ))}
        </View>

        {/* Restaurant cards */}
        <Skeleton width={140} height={14} radius={6} style={[S.mb8, { marginTop: 20 }]} />
        {[1, 2].map(i => (
          <View key={i} style={S.card}>
            <Skeleton height={110} radius={12} style={S.mb8} />
            <Skeleton width="70%" height={14} radius={6} style={S.mb8} />
            <Skeleton width="45%" height={11} radius={5} />
          </View>
        ))}
      </View>

      {/* Footer brand */}
      <Text style={S.footer}>Developed by {DEVELOPER}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F8F9FA' },
  headerBg:     { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingBottom: 12 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  lightSkeleton:{ backgroundColor: 'rgba(255,255,255,0.25)' },
  body:         { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
  row:          { flexDirection: 'row', flexWrap: 'nowrap', marginBottom: 6 },
  card:         { backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 12, elevation: 1 },
  mr8:          { marginRight: 8 },
  mb8:          { marginBottom: 8 },
  mb12:         { marginBottom: 12 },
  footer:       { textAlign: 'center', fontSize: 11, color: '#9CA3AF', paddingBottom: 24 },
});