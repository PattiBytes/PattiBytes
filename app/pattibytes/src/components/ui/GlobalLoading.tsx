// src/components/ui/GlobalLoading.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';

type Props = {
  /**
   * If true, show only the full-screen spinner.
   * If false, show dashboard skeleton blocks.
   */
  variant?: 'fullscreen' | 'dashboard';
};

export function GlobalLoading({ variant = 'fullscreen' }: Props) {
  if (variant === 'dashboard') {
    return (
      <View style={S.root}>
        {/* Header row skeleton */}
        <View style={S.headerRow}>
          <View style={[S.skel, S.logo]} />
          <View style={S.headerTextCol}>
            <View style={[S.skel, S.lineMd]} />
            <View style={[S.skel, S.lineSm]} />
          </View>
          <View style={[S.skel, S.icon]} />
          <View style={[S.skel, S.icon]} />
        </View>

        {/* Location bar */}
        <View style={[S.skel, S.location]} />

        {/* Search bar */}
        <View style={[S.skel, S.search]} />

        {/* Quick actions row */}
        <View style={S.row}>
          <View style={[S.skel, S.chip]} />
          <View style={[S.skel, S.chip]} />
          <View style={[S.skel, S.chip]} />
        </View>

        {/* Sections: deals + restaurants */}
        <View style={[S.skel, S.cardLg]} />
        <View style={[S.skel, S.cardLg]} />
        <View style={[S.skel, S.cardLg]} />
      </View>
    );
  }

  // Full-screen fallback spinner
  return (
    <View style={S.fullscreen}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const S = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#F8F9FA',
  },
  skel: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  logo: { width: 40, height: 40, borderRadius: 12 },
  headerTextCol: { flex: 1, gap: 6 },
  lineMd: { height: 14, width: '60%' },
  lineSm: { height: 10, width: '40%' },
  icon: { width: 32, height: 32, borderRadius: 999 },
  location: { height: 44, borderRadius: 12, marginBottom: 14 },
  search: { height: 44, borderRadius: 12, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chip: { flex: 1, height: 40, borderRadius: 999 },
  cardLg: { height: 120, borderRadius: 16, marginBottom: 14 },
});