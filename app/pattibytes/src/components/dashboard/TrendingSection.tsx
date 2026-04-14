import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet,
} from "react-native";
import { TrendingDish } from "./types";
import { COLORS } from "../../lib/constants";

interface Props {
  dishes: TrendingDish[];
  isFeatured?: boolean;   // true when showing featured fallback, not real trending
  onNav: (path: string) => void;
}

export function TrendingSection({ dishes, isFeatured, onNav }: Props) {
  if (!dishes.length) return null;

  const label = isFeatured ? "Featured Items \uD83C\uDF1F" : "Trending This Week \uD83D\uDD25";
  const sub   = isFeatured
    ? "Popular picks from our merchants"
    : "Most ordered items in the last 7 days";

  return (
    <View style={S.root}>
      {/* Section header */}
      <View style={S.header}>
        <View>
          <Text style={S.title}>{label}</Text>
          <Text style={S.sub}>{sub}</Text>
        </View>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.scroll}
      >
        {dishes.map((item) => (
          <TrendCard key={item.id} item={item} isFeatured={!!isFeatured} onNav={onNav} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Individual card ────────────────────────────────────────────────────────────
function TrendCard({
  item, isFeatured, onNav,
}: { item: TrendingDish; isFeatured: boolean; onNav: (p: string) => void }) {
  const hasDiscount = !!(item.discount_percentage && item.discount_percentage > 0);
  const finalPrice  = hasDiscount
    ? item.price * (1 - item.discount_percentage! / 100)
    : item.price;

  return (
    <TouchableOpacity
      style={S.card}
      onPress={() => onNav("/(customer)/restaurant/" + item.merchant_id)}
      activeOpacity={0.88}
    >
      {/* Image */}
      <View style={S.imgBox}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={S.img} resizeMode="cover" />
        ) : (
          <View style={[S.imgBox, S.imgPlaceholder]}>
            <Text style={{ fontSize: 36 }}>{"\uD83C\uDF71"}</Text>
          </View>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <View style={S.discBadge}>
            <Text style={S.discBadgeTxt}>{item.discount_percentage}% OFF</Text>
          </View>
        )}

        {/* Trending / Featured badge */}
        {!isFeatured && item.count > 0 ? (
          <View style={S.countBadge}>
            <Text style={S.countBadgeTxt}>{"\uD83D\uDD25 "}{item.count}x</Text>
          </View>
        ) : isFeatured ? (
          <View style={[S.countBadge, { backgroundColor: "rgba(99,102,241,0.85)" }]}>
            <Text style={S.countBadgeTxt}>{"\uD83C\uDF1F Featured"}</Text>
          </View>
        ) : null}

        {/* Veg / Non-veg indicator */}
        {"is_veg" in item && (
          <View style={[S.vegDot, { borderColor: item.is_veg ? "#16A34A" : "#DC2626" }]}>
            <View style={[S.vegDotInner, { backgroundColor: item.is_veg ? "#16A34A" : "#DC2626" }]} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={S.info}>
        <Text style={S.name} numberOfLines={2}>{item.name}</Text>
        <Text style={S.merchant} numberOfLines={1}>{item.merchant_name}</Text>
        <View style={S.priceRow}>
          <Text style={S.price}>{"\u20B9"}{Math.round(finalPrice)}</Text>
          {hasDiscount && (
            <Text style={S.priceOld}>{"\u20B9"}{item.price}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between",
            alignItems: "flex-end", paddingHorizontal: 16, marginBottom: 12 },
  title:  { fontSize: 16, fontWeight: "900", color: "#111827", lineHeight: 22 },
  sub:    { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  scroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },

  // Card
  card: {
    width: 148,
    backgroundColor: "#fff", borderRadius: 16,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    overflow: "hidden",
  },

  // Image area
  imgBox:         { width: 148, height: 130, backgroundColor: "#F3F4F6",
                    alignItems: "center", justifyContent: "center" },
  imgPlaceholder: { backgroundColor: "#FFF3EE" },
  img:            { width: "100%", height: "100%" },

  // Discount badge — top-left
  discBadge:    { position: "absolute", top: 8, left: 8, backgroundColor: COLORS.primary,
                  borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  discBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },

  // Count / featured badge — bottom-left
  countBadge:    { position: "absolute", bottom: 8, left: 8,
                   backgroundColor: "rgba(249,115,22,0.88)",
                   borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  countBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },

  // Veg indicator — top-right (standard green/red square dot)
  vegDot:      { position: "absolute", top: 8, right: 8, width: 16, height: 16,
                 borderRadius: 3, borderWidth: 2, backgroundColor: "#fff",
                 alignItems: "center", justifyContent: "center" },
  vegDotInner: { width: 7, height: 7, borderRadius: 3.5 },

  // Info
  info:     { padding: 10, gap: 3 },
  name:     { fontSize: 13, fontWeight: "800", color: "#111827", lineHeight: 18 },
  merchant: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  price:    { fontSize: 14, fontWeight: "900", color: COLORS.primary },
  priceOld: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through" },
});