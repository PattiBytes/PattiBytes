import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  useWindowDimensions,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/constants';

function merchantNameOf(m: any) {
  return String(m?.business_name ?? m?.businessname ?? m?.businessName ?? 'Restaurant');
}
function merchantLogoOf(m: any) {
  return m?.logo_url ?? m?.logourl ?? null;
}
function merchantBannerOf(m: any) {
  return m?.banner_url ?? m?.bannerurl ?? null;
}
function cuisineListOf(m: any) {
  const v = m?.cuisine_types ?? m?.cuisinetypes ?? [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

export default function RestaurantHeader({
  merchant,
  openNow,
  isFav,
  cartCount,
  onBack,
  onToggleFav,
  onShare,
  onGoCart,
}: {
  merchant: any;
  openNow: boolean;
  isFav: boolean;
  cartCount: number;
  onBack: () => void;
  onToggleFav: () => void;
  onShare: () => void; // keep if parent uses it
  onGoCart: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [shareOpen, setShareOpen] = useState(false);

  const name = useMemo(() => merchantNameOf(merchant), [merchant]);
  const banner = useMemo(() => merchantBannerOf(merchant), [merchant]);
  const logo = useMemo(() => merchantLogoOf(merchant), [merchant]);
  const cuisines = useMemo(() => cuisineListOf(merchant), [merchant]);

  const avg = Number(merchant?.average_rating ?? merchant?.averagerating ?? merchant?.rating ?? 0);
  const totalReviews = Number(merchant?.total_reviews ?? merchant?.totalreviews ?? 0);

  const bannerH = Math.round(width * 0.62);
  const LOGO = 74;

  const shareMessage = `Check out ${name} on PattiBytes.\nRestaurant ID: ${String(merchant?.id ?? '')}`;

  const doShare = async () => {
    try {
      setShareOpen(false);
      await Share.share({ message: shareMessage });
      Alert.alert('Shared', 'Thanks for sharing!');
    } catch (e: any) {
      Alert.alert('Share', e?.message ?? 'Could not share right now.');
    }
  };

  return (
    <View>
      <View style={[S.banner, { height: bannerH }]}>
        {banner ? (
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 34 }}>🍔</Text>
          </View>
        )}

        <View style={S.bannerShade} />

        <View style={[S.topBar, { top: insets.top + 10 }]}>
          <Pressable style={S.topBtn} onPress={onBack}>
            <Text style={S.topBtnTxt}>←</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={S.topBtn} onPress={() => setShareOpen(true)}>
              <Text style={S.topBtnTxt}>⤴</Text>
            </Pressable>

            <Pressable style={S.topBtn} onPress={onToggleFav}>
              <Text style={S.topBtnTxt}>{isFav ? '♥' : '♡'}</Text>
            </Pressable>

            <Pressable style={S.topBtn} onPress={onGoCart}>
              <Text style={S.topBtnTxt}>🛒</Text>
              {cartCount > 0 ? (
                <View style={S.badge}>
                  <Text style={S.badgeTxt}>{cartCount > 9 ? '9+' : String(cartCount)}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </View>

      <View style={S.infoCard}>
        <View style={[S.logoWrap, { width: LOGO, height: LOGO, borderRadius: LOGO / 2 }]}>
          {logo ? (
            <Image source={{ uri: logo }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
          ) : (
            <Text style={{ fontSize: 28 }}>🏪</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={S.name} numberOfLines={2}>{name}</Text>
            <View style={[S.openPill, { backgroundColor: openNow ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[S.openTxt, { color: openNow ? '#065F46' : '#991B1B' }]}>{openNow ? 'OPEN' : 'CLOSED'}</Text>
            </View>
          </View>

          {cuisines.length ? (
            <Text style={S.cuisine} numberOfLines={1}>{cuisines.slice(0, 6).join(' • ')}</Text>
          ) : null}

          <View style={S.metaRow}>
            <Text style={S.meta}>⭐ {avg.toFixed(1)} ({totalReviews})</Text>
            {!!merchant?.estimated_prep_time ? <Text style={S.meta}>⏱ {Number(merchant.estimated_prep_time)} min</Text> : null}
            {!!merchant?.min_order_amount ? <Text style={S.meta}>Min ₹{Number(merchant.min_order_amount)}</Text> : null}
          </View>
        </View>
      </View>

      <Modal transparent visible={shareOpen} animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={S.modalOverlay} onPress={() => setShareOpen(false)}>
          <Pressable style={S.modalCard} onPress={() => {}}>
            <Text style={S.modalTitle}>Share restaurant</Text>
            <Text style={S.modalMsg} numberOfLines={4}>{shareMessage}</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable style={[S.modalBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setShareOpen(false)}>
                <Text style={[S.modalBtnTxt, { color: COLORS.text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[S.modalBtn, { backgroundColor: COLORS.primary }]} onPress={doShare}>
                <Text style={[S.modalBtnTxt, { color: '#FFF' }]}>Share</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  banner: { width: '100%', backgroundColor: '#F3F4F6', overflow: 'hidden' },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },

  topBar: { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  topBtn: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', elevation: 4, position: 'relative' },
  topBtnTxt: { fontSize: 18, color: COLORS.text, fontWeight: '900' },

  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginTop: -22,
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },

  logoWrap: {
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
    flexShrink: 0,
    borderWidth: 3,
    borderColor: '#FFF',
  },

  name: { fontSize: 18, fontWeight: '900', color: COLORS.text, flexShrink: 1 },
  cuisine: { fontSize: 12, color: COLORS.textLight, marginTop: 3, fontWeight: '700' },

  openPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  openTxt: { fontSize: 10, fontWeight: '900' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  meta: { fontSize: 11, color: '#6B7280', fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 18, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  modalMsg: { marginTop: 8, fontSize: 12, color: COLORS.textLight, fontWeight: '700', lineHeight: 18 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnTxt: { fontWeight: '900', fontSize: 13 },
});
