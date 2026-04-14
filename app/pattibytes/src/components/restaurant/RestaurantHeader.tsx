// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  useWindowDimensions,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/constants';

// ── Merchant field normalizers ────────────────────────────────────────────────
function merchantNameOf(m: any) {
  return String(m?.business_name ?? m?.businessname ?? m?.businessName ?? 'Restaurant');
}
function merchantLogoOf(m: any)   { return m?.logo_url   ?? m?.logourl   ?? null; }
function merchantBannerOf(m: any) { return m?.banner_url ?? m?.bannerurl ?? null; }
function cuisineListOf(m: any) {
  const v = m?.cuisine_types ?? m?.cuisinetypes ?? [];
  if (Array.isArray(v))        return v.map(String).filter(Boolean);
  if (typeof v === 'string')   return v.split(',').map(x => x.trim()).filter(Boolean);
  return [];
}

// ── Time formatter ────────────────────────────────────────────────────────────
function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [hh, mm] = String(t).split(':');
  const h = Number(hh);
  return `${h % 12 || 12}:${mm || '00'} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ── Today's opening hours ─────────────────────────────────────────────────────
function getTodayHours(m: any): { open: string; close: string } | null {
  const oh = m?.opening_hours;
  if (!oh || typeof oh !== 'object') return null;
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const day  = days[new Date().getDay()];
  const slot = oh[day] ?? oh[day.slice(0, 3)] ?? null;
  if (slot?.open && slot?.close) return { open: slot.open, close: slot.close };
  return null;
}

// ── Delivery fee ──────────────────────────────────────────────────────────────
function deliveryFeeOf(m: any): number | null {
  const v = m?.delivery_fee ?? m?.deliveryfee ?? m?.base_delivery_fee ?? null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface RestaurantHeaderProps {
  merchant:       any;
  openNow:        boolean;
  closedMessage?: string | null;
  isFav:          boolean;
  cartCount:      number;
  onBack:         () => void;
  onToggleFav:    () => void;
  onShare:        () => void;   // kept for API compat — header calls its own share
  onGoCart:       () => void;
}

export default function RestaurantHeader({
  merchant,
  openNow,
  closedMessage,
  isFav,
  cartCount,
  onBack,
  onToggleFav,
  onGoCart,
}: RestaurantHeaderProps) {
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();

  const name      = useMemo(() => merchantNameOf(merchant), [merchant]);
  const banner    = useMemo(() => merchantBannerOf(merchant), [merchant]);
  const logo      = useMemo(() => merchantLogoOf(merchant), [merchant]);
  const cuisines  = useMemo(() => cuisineListOf(merchant), [merchant]);

  const avg          = Number(merchant?.average_rating ?? merchant?.averagerating ?? merchant?.rating ?? 0);
  const totalReviews = Number(merchant?.total_reviews  ?? merchant?.totalreviews  ?? 0);
  const deliveryFee  = deliveryFeeOf(merchant);
  const todayHours   = getTodayHours(merchant);

  const bannerH = Math.round(width * 0.62);
  const LOGO    = 74;

  // ── Share restaurant ───────────────────────────────────────────────────────
  // Rules for WhatsApp link preview:
  //   1. URL must start with https://
  //   2. URL must be on its OWN line (no text before/after)
  //   3. Blank line before URL triggers large preview card
  const doShare = async () => {
    try {
      const storeUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/pattibytes-express/id6761598840'
        : 'https://play.google.com/store/apps/details?id=com.pattibytes.express';

      const message = [
        `🏪 Order from *${name}* on PattiBytes Express!`,
        `Fast delivery in Patti area 🛵`,
        ``,          // blank line → WhatsApp large preview card
        storeUrl,    // own line, nothing else → detected as tap-able link ✅
      ].join('\n');

      await Share.share(
        {
          message,           // Android reads `message`; iOS reads `url`
          url:     storeUrl, // iOS system share card
          title:   `${name} · PattiBytes`,
        },
        { dialogTitle: `Share ${name}` },
      );
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Share', e?.message ?? 'Could not share right now.');
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#000' }}>
      <View>
        {/* ── Banner ── */}
        <View style={[S.banner, { height: bannerH }]}>
          {banner ? (
            <Image
              source={{ uri: banner }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, S.bannerFallback]}>
              <Text style={{ fontSize: 48 }}>🍽️</Text>
            </View>
          )}
          <View style={S.bannerShade} />

          {/* Top action buttons */}
          <View style={[S.topBar, { top: insets.top + 10 }]}>
            <Pressable style={S.topBtn} onPress={onBack}>
              <Text style={S.topBtnTxt}>←</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Share — calls doShare directly, no modal needed */}
              <Pressable style={S.topBtn} onPress={doShare}>
                <Text style={S.topBtnTxt}>⤴</Text>
              </Pressable>

              <Pressable style={S.topBtn} onPress={onToggleFav}>
                <Text style={[S.topBtnTxt, isFav && { color: '#EF4444' }]}>
                  {isFav ? '♥' : '♡'}
                </Text>
              </Pressable>

              <Pressable style={S.topBtn} onPress={onGoCart}>
                <Text style={S.topBtnTxt}>🛒</Text>
                {cartCount > 0 && (
                  <View style={S.badge}>
                    <Text style={S.badgeTxt}>
                      {cartCount > 9 ? '9+' : String(cartCount)}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Open/Closed badge on banner */}
          <View style={[S.bannerStatusBadge, { backgroundColor: openNow ? '#065F46' : '#991B1B' }]}>
            <View style={[S.statusDot, { backgroundColor: openNow ? '#4ADE80' : '#F87171' }]} />
            <Text style={S.bannerStatusTxt}>{openNow ? 'OPEN NOW' : 'CLOSED'}</Text>
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={S.infoCard}>
          <View style={[S.logoWrap, { width: LOGO, height: LOGO, borderRadius: LOGO / 2 }]}>
            {logo ? (
              <Image source={{ uri: logo }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 28 }}>🏪</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={S.name} numberOfLines={2}>{name}</Text>
              <View style={[S.openPill, { backgroundColor: openNow ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[S.openTxt, { color: openNow ? '#065F46' : '#991B1B' }]}>
                  {openNow ? 'OPEN' : 'CLOSED'}
                </Text>
              </View>
            </View>

            {cuisines.length > 0 && (
              <Text style={S.cuisine} numberOfLines={1}>
                {cuisines.slice(0, 6).join(' • ')}
              </Text>
            )}

            <View style={S.metaRow}>
              {avg > 0 && (
                <Text style={S.meta}>⭐ {avg.toFixed(1)} ({totalReviews})</Text>
              )}
              {!!merchant?.estimated_prep_time && (
                <Text style={S.meta}>⏱ {Number(merchant.estimated_prep_time)} min</Text>
              )}
              {!!merchant?.min_order_amount && (
                <Text style={S.meta}>Min ₹{Number(merchant.min_order_amount)}</Text>
              )}
              {deliveryFee !== null && deliveryFee > 0 && (
                <Text style={S.meta}>🚚 ₹{deliveryFee} delivery</Text>
              )}
            </View>

            {(todayHours || merchant?.opening_time) && (
              <View style={S.hoursRow}>
                <Text style={S.hoursTxt}>
                  🕐{' '}
                  {todayHours
                    ? `${formatTime(todayHours.open)} – ${formatTime(todayHours.close)}`
                    : `${formatTime(merchant.opening_time)}${merchant?.closing_time ? ` – ${formatTime(merchant.closing_time)}` : ''}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Closed banner ── */}
        {!openNow && (
          <View style={S.closedBanner}>
            <Text style={S.closedIcon}>🔴</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.closedTitle}>Restaurant is currently closed</Text>
              <Text style={S.closedSub}>
                {closedMessage ??
                  (merchant?.opening_time
                    ? `Opens at ${formatTime(merchant.opening_time)}${merchant?.closing_time ? ` · Closes ${formatTime(merchant.closing_time)}` : ''}`
                    : 'Check back during opening hours')}
              </Text>
            </View>
            <View style={S.closedRightBadge}>
              <Text style={S.closedRightTxt}>Browse{'\n'}Only</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles (unchanged) ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  banner:          { width: '100%', backgroundColor: '#F3F4F6', overflow: 'hidden' },
  bannerFallback:  { backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center' },
  bannerShade:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)' },
  topBar:          { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  topBtn:          { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', elevation: 4, position: 'relative' },
  topBtnTxt:       { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  badge:           { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeTxt:        { color: '#FFF', fontSize: 9, fontWeight: '900' },
  bannerStatusBadge: { position: 'absolute', bottom: 12, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot:       { width: 7, height: 7, borderRadius: 4 },
  bannerStatusTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  infoCard:        { backgroundColor: '#FFF', marginHorizontal: 12, marginTop: -22, borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  logoWrap:        { backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 2, flexShrink: 0, borderWidth: 3, borderColor: '#FFF' },
  name:            { fontSize: 18, fontWeight: '900', color: COLORS.text, flexShrink: 1 },
  cuisine:         { fontSize: 12, color: COLORS.textLight, marginTop: 3, fontWeight: '700' },
  openPill:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  openTxt:         { fontSize: 10, fontWeight: '900' },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  meta:            { fontSize: 11, color: '#6B7280', fontWeight: '800' },
  hoursRow:        { marginTop: 6 },
  hoursTxt:        { fontSize: 11, color: COLORS.textLight, fontWeight: '700' },
  closedBanner:    { marginHorizontal: 12, marginTop: 10, borderRadius: 14, backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  closedIcon:      { fontSize: 20 },
  closedTitle:     { fontSize: 13, fontWeight: '900', color: '#991B1B' },
  closedSub:       { fontSize: 11, fontWeight: '600', color: '#B91C1C', marginTop: 2, lineHeight: 16 },
  closedRightBadge:{ backgroundColor: '#FCA5A5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  closedRightTxt:  { fontSize: 9, fontWeight: '900', color: '#7F1D1D', textAlign: 'center', lineHeight: 13 },
});