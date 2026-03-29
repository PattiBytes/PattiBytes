import React from "react";
import { View, Text } from "react-native";
import { S } from "./profileStyles";

interface Props {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: Props) {
  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={S.infoVal} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}