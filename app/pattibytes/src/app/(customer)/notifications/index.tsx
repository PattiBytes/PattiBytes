// src/app/(customer)/notifications/index.tsx
import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useNotifications, AppNotification } from "../../../hooks/useNotifications";
import { COLORS } from "../../../lib/constants";

const TYPE_ICON: Record<string, string> = {
  order: "📦",
  promo: "🏷️",
  system: "⚙️",
  approval: "✅",
  general: "🔔",
};

function NotifCard({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const icon = TYPE_ICON[item.type ?? "general"] ?? "🔔";
  const date = new Date(item.created_at);
  const timeStr = date.toLocaleString("en-IN", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[S.card, !item.is_read && S.cardUnread]}
      activeOpacity={0.8}
    >
      <View style={S.iconWrap}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        {!item.is_read ? <View style={S.dot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.title, !item.is_read && { color: COLORS.text }]}>
          {item.title ?? "Notification"}
        </Text>
        <Text style={S.body} numberOfLines={2}>
          {item.body ?? item.message ?? ""}
        </Text>
        <Text style={S.time}>{timeStr}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, refresh } =
    useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handlePress = async (item: AppNotification) => {
    if (!item.is_read) await markAsRead(item.id);
    // Navigate based on type
    const d = typeof item.data === "string" ? JSON.parse(item.data || "{}") : (item.data ?? {});
    const orderId = d.orderId ?? d.order_id;
    if ((item.type === "order" || orderId) && orderId) {
      router.push(`/(customer)/orders/${orderId}` as any);
    }
  };

  if (loading) {
    return (
      <View style={S.center}>
        <Stack.Screen options={{ title: "Notifications" }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead} style={{ marginRight: 16 }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotifCard item={item} onPress={() => handlePress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={{ fontSize: 52, marginBottom: 14 }}>🔔</Text>
            <Text style={S.emptyTxt}>No notifications yet.</Text>
            <Text style={[S.emptyTxt, { fontSize: 13, marginTop: 6 }]}>
              Order updates and offers will show up here.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      />
    </View>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff",
  },
  cardUnread: { backgroundColor: "#FFF7F4" },
  iconWrap: { position: "relative", paddingTop: 2 },
  dot: {
    position: "absolute", top: 0, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: "#fff",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 3 },
  body: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  time: { fontSize: 11, color: "#9CA3AF", marginTop: 5 },
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 80, paddingHorizontal: 32,
  },
  emptyTxt: { fontSize: 16, color: "#6B7280", fontWeight: "700", textAlign: "center" },
});
