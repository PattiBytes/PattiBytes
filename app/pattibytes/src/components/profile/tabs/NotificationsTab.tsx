import React from "react";
import { View, Text, Switch } from "react-native";
import { S } from "../profileStyles";
import { Section } from "../Section";
import { COLORS } from "../../../lib/constants";
import type { NotificationPrefs } from "../types";

interface Props {
  prefs: NotificationPrefs;
  savePrefs: (next: NotificationPrefs) => void;
}

const TOGGLES = [
  {
    key: "order_updates" as const,
    label: "Order updates",
    sub: "Preparing, out for delivery, delivered",
    emoji: "📦",
  },
  {
    key: "promos" as const,
    label: "Promos & offers",
    sub: "Discounts and coupon alerts",
    emoji: "🏷️",
  },
  {
    key: "system" as const,
    label: "System alerts",
    sub: "Account, security, important info",
    emoji: "🔔",
  },
] as const;

export function NotificationsTab({ prefs, savePrefs }: Props) {
  return (
    <Section title="Notification preferences">
      {TOGGLES.map((x) => {
        const enabled = prefs[x.key];
        return (
          <View key={x.key} style={S.toggleRow}>
            <Text style={{ fontSize: 22, width: 36 }}>{x.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.toggleTitle}>{x.label}</Text>
              <Text style={S.toggleSub}>{x.sub}</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={(val) =>
                savePrefs({ ...prefs, [x.key]: val })
              }
              trackColor={{ false: "#E5E7EB", true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        );
      })}
      <Text style={S.helperTxt}>
        ⚠️ If notifications stop arriving, check battery optimisation and
        notification permissions in device settings.
      </Text>
    </Section>
  );
}