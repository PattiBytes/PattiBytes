import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { S } from "./profileStyles";
import { Pill } from "./Pill";
import { safeNum, safeBool , moneyINR } from "./helpers";
import type { ProfileRow, Stats } from "./types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { COLORS } from "../../lib/constants";

interface Props {
  profile: ProfileRow | null;
  displayName: string;
  email: string;
  stats: Stats;
  uploading: boolean;
  onPickAvatar: () => void;
}

export function ProfileHero({
  profile,
  displayName,
  email,
  stats,
  uploading,
  onPickAvatar,
}: Props) {
  const role = String(profile?.role ?? "customer").toUpperCase();
  const approval = String(profile?.approval_status ?? "approved").toLowerCase();
  const account = String(profile?.account_status ?? "active").toLowerCase();
  const trusted = safeBool(profile?.is_trusted, false);
  const trustScore = safeNum(profile?.trust_score, 0);

  return (
    <>
      {/* Hero header */}
      <View style={S.hero}>
        <TouchableOpacity
          onPress={onPickAvatar}
          disabled={uploading}
          style={{ marginBottom: 14, position: "relative" }}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={S.avatar} />
          ) : (
            <View style={S.avatarPlaceholder}>
              <Text
                style={{ fontSize: 38, color: "#fff", fontWeight: "900" }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={S.cameraBtn}>
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff" }}>📷</Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={S.heroName}>{displayName}</Text>
        {profile?.username ? (
          <Text style={S.heroUsername}>@{profile.username}</Text>
        ) : null}
        <Text style={S.heroEmail}>{email}</Text>

        <View style={S.pillRow}>
          <Pill text={`👤 ${role}`} />
          {approval !== "approved" ? (
            <Pill text={`⏳ ${approval.toUpperCase()}`} tone="warn" />
          ) : null}
          {account === "banned" ? (
            <Pill text="🚫 BANNED" tone="bad" />
          ) : account === "pending_deletion" ? (
            <Pill text="⚠️ DELETION PENDING" tone="bad" />
          ) : account !== "active" ? (
            <Pill text={`⚠️ ${account.toUpperCase()}`} tone="bad" />
          ) : null}
          {trusted ? <Pill text="✅ TRUSTED" tone="good" /> : null}
        </View>

        <View style={S.trustBarWrap}>
          <View style={S.trustBarBg}>
            <View
              style={[
                S.trustBarFill,
                {
                  width: `${Math.min(100, Math.max(0, trustScore))}%` as any,
                },
              ]}
            />
          </View>
          <Text style={S.trustTxt}>Trust score: {trustScore} / 100</Text>
        </View>
      </View>

      {/* Stats strip */}
      <View style={S.statsRow}>
        {[
          { label: "Orders", value: String(stats.total), emoji: "📦" },
          { label: "Done", value: String(stats.completed), emoji: "✅" },
          { label: "Cancelled", value: String(stats.cancelled), emoji: "❌" },
          { label: "Spent", value: moneyINR(stats.totalSpent), emoji: "💰" },
        ].map((x, i) => (
          <View key={x.label} style={[S.statCard, i < 3 && S.statDivider]}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{x.emoji}</Text>
            <Text style={S.statVal}>{x.value}</Text>
            <Text style={S.statLbl}>{x.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}