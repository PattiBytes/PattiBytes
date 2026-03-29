import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { S } from "./profileStyles";
import type { TabKey } from "./types";

interface Props {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "profile", label: "Profile", emoji: "👤" },
  { key: "addresses", label: "Addresses", emoji: "📍" },
  { key: "notifications", label: "Notifs", emoji: "🔔" },
  { key: "security", label: "Security", emoji: "🔒" },
  { key: "requests", label: "Requests", emoji: "📋" },
];

export function TabBar({ tab, setTab }: Props) {
  return (
    <View style={S.tabRow}>
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[S.tabBtn, active && S.tabBtnActive]}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
            <Text style={[S.tabTxt, active && S.tabTxtActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}