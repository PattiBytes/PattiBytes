// src/components/NotificationBell.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "../hooks/useNotifications";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { COLORS } from "../lib/constants";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push("/(customer)/notifications" as any)}
      style={S.wrap}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={{ fontSize: 22 }}>🔔</Text>
      {unreadCount > 0 ? (
        <View style={S.badge}>
          <Text style={S.badgeTxt}>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  wrap: { position: "relative", marginRight: 4 },
  badge: {
    position: "absolute", top: -4, right: -6,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: "#fff",
  },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "900" },
});
